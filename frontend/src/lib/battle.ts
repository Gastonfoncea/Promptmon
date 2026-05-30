/**
 * Timeline puro de la secuencia de batalla (PRO-32). Sin React/Three: testeable.
 * Es coreografía cosmética — el ganador ya lo decidió el contrato. Acá solo
 * decimos dónde está cada criatura en cada instante y cuándo vuelan los poderes.
 */

export const BATTLE = {
  faceoffEndMs: 1200, // entran y se encaran
  clashEndMs: 3800, // intercambio de poderes
  finalBlowMs: 4400, // golpe decisivo + tambaleo
  absorbEndMs: 6600, // perdedor absorbido (impacto: flash/sirena/contador)
  totalMs: 8000, // se permite cerrar
} as const;

/** Posiciones de reposo durante el clash (exportadas para ubicar los poderes). */
export const WINNER_HOLD_X = 1.8;
export const LOSER_HOLD_X = -1.8;
const OFFSCREEN = 5;
/** A dónde queda el perdedor tras el golpe final (de ahí arranca la absorción). */
const LOSER_KNOCKED_X = LOSER_HOLD_X - 1.3;

/** Tiempo de viaje de un poder (ms). Compartido con PowerBlast: define cuándo IMPACTA. */
export const BLAST_TRAVEL_MS = 550;

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Embestida: bump 0→1→0 alrededor del momento `atMs` en que el atacante dispara.
 * El que tira el poder se lanza hacia adelante y vuelve. Ventana ±200ms.
 */
export function volleyLunge(t: number, atMs: number): number {
  const dist = Math.abs(t - atMs);
  const window = 200;
  if (dist > window) return 0;
  return Math.cos((dist / window) * (Math.PI / 2)); // 1 en atMs → 0 en los bordes
}

/** Color determinístico por id (mismo bicho → mismo color). Ángulo áureo = bien separados. */
export function colorFor(id: bigint): string {
  const hue = (Number(id % BigInt(360)) * 137.508) % 360;
  return `hsl(${Math.round(hue)}, 85%, 60%)`;
}

export type BattlePhase = "faceoff" | "clash" | "final" | "absorb" | "result";

export interface ActorFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  tilt: number;
}

export interface BattleFrame {
  phase: BattlePhase;
  winner: ActorFrame & { glow: number };
  loser: ActorFrame;
  impact: boolean;
}

/** Poderes que vuelan durante el clash: cuándo y quién los tira. */
export interface Volley {
  atMs: number;
  by: "winner" | "loser";
}
export const VOLLEYS: Volley[] = [
  { atMs: 1500, by: "loser" },
  { atMs: 2050, by: "winner" },
  { atMs: 2600, by: "loser" },
  { atMs: 3150, by: "winner" },
  { atMs: 3650, by: "winner" }, // arma el golpe final
];

/** Estado de la batalla en un instante (ms desde el inicio). */
export function battleFrame(t: number): BattleFrame {
  // 1. Face-off: entran desde fuera de pantalla.
  if (t < BATTLE.faceoffEndMs) {
    const p = easeInOutCubic(clamp01(t / BATTLE.faceoffEndMs));
    return {
      phase: "faceoff",
      winner: { x: lerp(OFFSCREEN, WINNER_HOLD_X, p), y: 0, scale: 1, opacity: 1, tilt: 0, glow: 0 },
      loser: { x: lerp(-OFFSCREEN, LOSER_HOLD_X, p), y: 0, scale: 1, opacity: 1, tilt: 0 },
      impact: false,
    };
  }

  // 2. Clash: se mantienen, con un leve bob mientras intercambian poderes.
  if (t < BATTLE.clashEndMs) {
    const bob = Math.sin(t / 200) * 0.05;
    return {
      phase: "clash",
      winner: { x: WINNER_HOLD_X, y: bob, scale: 1, opacity: 1, tilt: 0, glow: 0 },
      loser: { x: LOSER_HOLD_X, y: -bob, scale: 1, opacity: 1, tilt: 0 },
      impact: false,
    };
  }

  // 3. Golpe final: el ganador embiste, el perdedor sale despedido y se inclina.
  if (t < BATTLE.finalBlowMs) {
    const p = easeInOutCubic(
      clamp01((t - BATTLE.clashEndMs) / (BATTLE.finalBlowMs - BATTLE.clashEndMs)),
    );
    return {
      phase: "final",
      winner: { x: WINNER_HOLD_X - 0.9 * p, y: 0, scale: 1 + 0.1 * p, opacity: 1, tilt: -0.12 * p, glow: 0.3 * p },
      loser: { x: lerp(LOSER_HOLD_X, LOSER_KNOCKED_X, p), y: 0, scale: 1, opacity: 1, tilt: 0.6 * p },
      impact: false,
    };
  }

  // 4. Conquista: el perdedor viaja hacia el ganador, encoge y se desvanece.
  if (t < BATTLE.absorbEndMs) {
    const p = easeInOutCubic(
      clamp01((t - BATTLE.finalBlowMs) / (BATTLE.absorbEndMs - BATTLE.finalBlowMs)),
    );
    return {
      phase: "absorb",
      winner: { x: lerp(WINNER_HOLD_X - 0.5, WINNER_HOLD_X, p), y: 0, scale: 1 + 0.18 * p, opacity: 1, tilt: 0, glow: clamp01((p - 0.5) / 0.5) },
      loser: {
        x: lerp(LOSER_KNOCKED_X, WINNER_HOLD_X, p),
        y: Math.sin(p * Math.PI) * 0.7,
        scale: 1 - 0.9 * p,
        opacity: 1 - p,
        tilt: 0.5 + p,
      },
      impact: p >= 1,
    };
  }

  // 5. Resultado: ganador solo, perdedor ya absorbido.
  return {
    phase: "result",
    winner: { x: WINNER_HOLD_X, y: 0, scale: 1.18, opacity: 1, tilt: 0, glow: 1 },
    loser: { x: WINNER_HOLD_X, y: 0, scale: 0, opacity: 0, tilt: 0 },
    impact: true,
  };
}

/**
 * Timeline puro de la animación de CONQUISTA (PRO-23, WOW #2).
 * Sin dependencias de React/Three: testeable y reutilizable por la escena 3D
 * y por el overlay (flash, contador, sirena se sincronizan con estos tiempos).
 */
export const CONQUEST = {
  /** Aparición de ambas criaturas. */
  appearMs: 700,
  /** El perdedor empieza a viajar hacia el ganador. */
  travelStartMs: 700,
  /** El perdedor termina absorbido (impacto: flash + sirena + contador). */
  travelEndMs: 2400,
  /** Duración total antes de permitir el cierre automático. */
  totalMs: 4200,
} as const;

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface ConquestFrame {
  /** 0 = en su lado, 1 = absorbido por el ganador (con easing). */
  loserProgress: number;
  /** Escala del perdedor: encoge al ser absorbido. */
  loserScale: number;
  /** Opacidad del perdedor: se desvanece. */
  loserOpacity: number;
  /** Glow violeta del ganador (0..1), sube cerca del impacto. */
  winnerGlow: number;
  /** True una vez consumada la absorción (momento del flash/sirena). */
  impactReached: boolean;
}

/** Estado de la animación en un instante dado (ms desde el inicio). */
export function conquestFrame(elapsedMs: number): ConquestFrame {
  const raw = clamp01(
    (elapsedMs - CONQUEST.travelStartMs) /
      (CONQUEST.travelEndMs - CONQUEST.travelStartMs),
  );
  const e = easeInOutCubic(raw);
  return {
    loserProgress: e,
    loserScale: 1 - 0.85 * e, // 1 → 0.15
    loserOpacity: 1 - e, // 1 → 0
    winnerGlow: raw < 0.6 ? 0 : clamp01((raw - 0.6) / 0.4),
    impactReached: raw >= 1,
  };
}

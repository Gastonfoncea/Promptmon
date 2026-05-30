/**
 * Curvas de la animación de NACIMIENTO de la criatura (PRO-17, WOW #1).
 *
 * Puras y sin three.js → testeables sin WebGL. El componente acumula el tiempo
 * con useFrame y le pide a `spawnState(elapsedMs)` cómo está la animación en ese
 * instante (escala, opacidad, glow). La idea: que la criatura se "materialice"
 * en ~2s en vez de aparecer de golpe.
 */

/** Duración total de la animación de nacimiento (ms). 2-3s según el pitch. */
export const SPAWN_DURATION_MS = 2000;

/** Intensidad pico del point light violeta Monad durante el nacimiento. */
export const SPAWN_GLOW_MAX = 9;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Ease out cúbico: arranca rápido y desacelera. Monótona 0→1. */
export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Ease out "back": sobrepasa levemente 1 y vuelve, dando una sensación de
 * "rebote vivo" al aparecer. Vale 0 en t=0 y 1 en t=1.
 */
export function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export interface SpawnState {
  /** Progreso lineal 0→1 de la animación. */
  progress: number;
  /** Multiplicador de escala (0 → ~1, con leve overshoot). */
  scale: number;
  /** Opacidad de los materiales (0→1, monótona). */
  opacity: number;
  /** Intensidad relativa del glow (0→1→0, pico al medio). */
  glow: number;
  /** true cuando la animación terminó. */
  done: boolean;
}

/**
 * Estado de la animación de nacimiento en `elapsedMs` desde que apareció la criatura.
 */
export function spawnState(
  elapsedMs: number,
  durationMs: number = SPAWN_DURATION_MS,
): SpawnState {
  const progress = durationMs > 0 ? clamp01(elapsedMs / durationMs) : 1;
  return {
    progress,
    scale: easeOutBack(progress),
    opacity: easeOutCubic(progress),
    // Sinusoide: 0 al inicio, 1 al medio, 0 al final → el glow "respira".
    glow: Math.sin(progress * Math.PI),
    done: progress >= 1,
  };
}

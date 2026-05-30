import { describe, it, expect } from "vitest";
import {
  spawnState,
  easeOutCubic,
  easeOutBack,
  SPAWN_DURATION_MS,
} from "./spawnAnimation";

describe("easings", () => {
  it("easeOutCubic va de 0 a 1 y es monótona", () => {
    expect(easeOutCubic(0)).toBeCloseTo(0);
    expect(easeOutCubic(1)).toBeCloseTo(1);
    expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.75));
  });

  it("easeOutBack arranca en 0, termina en 1 y sobrepasa 1 en el medio (overshoot)", () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
    // en algún punto antes del final pasa de 1 (rebote)
    expect(easeOutBack(0.7)).toBeGreaterThan(1);
  });

  it("clampea fuera de [0,1]", () => {
    expect(easeOutCubic(-1)).toBeCloseTo(0);
    expect(easeOutCubic(2)).toBeCloseTo(1);
    expect(easeOutBack(2)).toBeCloseTo(1);
  });
});

describe("spawnState", () => {
  it("al inicio la criatura es invisible y diminuta", () => {
    const s = spawnState(0);
    expect(s.scale).toBeCloseTo(0);
    expect(s.opacity).toBeCloseTo(0);
    expect(s.glow).toBeCloseTo(0);
    expect(s.done).toBe(false);
  });

  it("al final está a escala 1, opaca y sin glow, y marca done", () => {
    const s = spawnState(SPAWN_DURATION_MS);
    expect(s.scale).toBeCloseTo(1);
    expect(s.opacity).toBeCloseTo(1);
    expect(s.glow).toBeCloseTo(0);
    expect(s.done).toBe(true);
  });

  it("el glow tiene su pico en la mitad", () => {
    const s = spawnState(SPAWN_DURATION_MS / 2);
    expect(s.glow).toBeCloseTo(1);
  });

  it("clampea el progreso si se pasa la duración", () => {
    const s = spawnState(SPAWN_DURATION_MS * 5);
    expect(s.progress).toBe(1);
    expect(s.done).toBe(true);
  });

  it("la opacidad crece de forma monótona durante la animación", () => {
    const early = spawnState(SPAWN_DURATION_MS * 0.2).opacity;
    const mid = spawnState(SPAWN_DURATION_MS * 0.5).opacity;
    const late = spawnState(SPAWN_DURATION_MS * 0.8).opacity;
    expect(early).toBeLessThan(mid);
    expect(mid).toBeLessThan(late);
  });
});

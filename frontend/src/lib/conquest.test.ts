import { describe, expect, it } from "vitest";
import {
  clamp01,
  conquestFrame,
  CONQUEST,
  easeInOutCubic,
} from "./conquest";

describe("clamp01", () => {
  it("acota a [0,1]", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(5)).toBe(1);
  });
});

describe("easeInOutCubic", () => {
  it("ancla en 0 y 1 y pasa por 0.5", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });
});

describe("conquestFrame", () => {
  it("antes de viajar: perdedor entero en su lado", () => {
    const f = conquestFrame(0);
    expect(f.loserProgress).toBe(0);
    expect(f.loserScale).toBeCloseTo(1, 5);
    expect(f.loserOpacity).toBeCloseTo(1, 5);
    expect(f.impactReached).toBe(false);
  });

  it("al terminar el viaje: absorbido (encogido, invisible, impacto)", () => {
    const f = conquestFrame(CONQUEST.travelEndMs);
    expect(f.loserProgress).toBeCloseTo(1, 5);
    expect(f.loserScale).toBeCloseTo(0.15, 5);
    expect(f.loserOpacity).toBeCloseTo(0, 5);
    expect(f.winnerGlow).toBeCloseTo(1, 5);
    expect(f.impactReached).toBe(true);
  });

  it("el glow del ganador recién prende en la segunda mitad del viaje", () => {
    const mid = CONQUEST.travelStartMs + (CONQUEST.travelEndMs - CONQUEST.travelStartMs) * 0.5;
    expect(conquestFrame(mid).winnerGlow).toBe(0);
  });
});

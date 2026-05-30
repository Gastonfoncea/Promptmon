import { describe, expect, it } from "vitest";
import {
  BATTLE,
  battleFrame,
  clamp01,
  colorFor,
  easeInOutCubic,
  lerp,
  volleyLunge,
} from "./battle";

describe("helpers", () => {
  it("clamp01 / lerp / easeInOutCubic", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
});

describe("volleyLunge", () => {
  it("es máximo (1) en el momento del disparo y 0 fuera de la ventana", () => {
    expect(volleyLunge(1500, 1500)).toBeCloseTo(1, 5);
    expect(volleyLunge(1500, 2000)).toBe(0); // 500ms > ventana 200
    expect(volleyLunge(2000, 1500)).toBe(0);
  });
  it("decae suave dentro de la ventana", () => {
    const v = volleyLunge(1600, 1500); // 100ms del centro
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});

describe("colorFor", () => {
  it("es determinístico", () => {
    expect(colorFor(BigInt(7))).toBe(colorFor(BigInt(7)));
  });
  it("da colores distintos para ids consecutivos", () => {
    expect(colorFor(BigInt(1))).not.toBe(colorFor(BigInt(2)));
  });
});

describe("battleFrame", () => {
  it("arranca en face-off con las criaturas fuera de pantalla", () => {
    const f = battleFrame(0);
    expect(f.phase).toBe("faceoff");
    expect(f.winner.x).toBeGreaterThan(3);
    expect(f.loser.x).toBeLessThan(-3);
    expect(f.impact).toBe(false);
  });

  it("pasa por todas las fases en orden", () => {
    expect(battleFrame(600).phase).toBe("faceoff");
    expect(battleFrame(2000).phase).toBe("clash");
    expect(battleFrame(4100).phase).toBe("final");
    expect(battleFrame(5500).phase).toBe("absorb");
    expect(battleFrame(7000).phase).toBe("result");
  });

  it("en el impacto el perdedor está absorbido (encogido, invisible)", () => {
    const f = battleFrame(BATTLE.absorbEndMs);
    expect(f.impact).toBe(true);
    expect(f.loser.scale).toBeLessThan(0.2);
    expect(f.loser.opacity).toBeCloseTo(0, 5);
    expect(f.winner.glow).toBeCloseTo(1, 5);
  });

  it("durante el clash las criaturas están enfrentadas y enteras", () => {
    const f = battleFrame(2500);
    expect(f.winner.x).toBeGreaterThan(0);
    expect(f.loser.x).toBeLessThan(0);
    expect(f.loser.opacity).toBe(1);
  });
});

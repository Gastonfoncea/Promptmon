import { describe, it, expect } from "vitest";
import { computeFitTransform, type BoundingBox } from "./fitModel";

describe("computeFitTransform", () => {
  it("escala la dimensión mayor a targetSize", () => {
    const box: BoundingBox = { min: [0, 0, 0], max: [10, 4, 2] };
    const { scale } = computeFitTransform(box, 2);
    // dimensión mayor = 10 → scale = 2/10
    expect(scale).toBeCloseTo(0.2);
  });

  it("da escala consistente: modelos de tamaños distintos quedan del mismo tamaño final", () => {
    const grande: BoundingBox = { min: [0, 0, 0], max: [100, 50, 50] };
    const chico: BoundingBox = { min: [0, 0, 0], max: [0.5, 0.2, 0.1] };
    const target = 2;

    const sGrande = computeFitTransform(grande, target).scale;
    const sChico = computeFitTransform(chico, target).scale;

    // tras escalar, la dimensión mayor de ambos mide exactamente target
    expect(sGrande * 100).toBeCloseTo(target);
    expect(sChico * 0.5).toBeCloseTo(target);
  });

  it("centra en el origen un modelo desplazado", () => {
    // box centrado en (10,10,10), cubo de lado 2 → maxDim 2, scale = target/2
    const box: BoundingBox = { min: [9, 9, 9], max: [11, 11, 11] };
    const target = 2;
    const { scale, position } = computeFitTransform(box, target);
    // scale = 1 (maxDim 2, target 2). centro (10,10,10) → position = -10*1
    expect(scale).toBeCloseTo(1);
    expect(position[0]).toBeCloseTo(-10);
    expect(position[1]).toBeCloseTo(-10);
    expect(position[2]).toBeCloseTo(-10);
  });

  it("un modelo ya centrado en el origen no se traslada", () => {
    const box: BoundingBox = { min: [-1, -1, -1], max: [1, 1, 1] };
    const { position } = computeFitTransform(box, 2);
    expect(position[0]).toBeCloseTo(0);
    expect(position[1]).toBeCloseTo(0);
    expect(position[2]).toBeCloseTo(0);
  });

  it("no rompe con un modelo degenerado (tamaño cero)", () => {
    const box: BoundingBox = { min: [5, 5, 5], max: [5, 5, 5] };
    const { scale, position } = computeFitTransform(box, 2);
    expect(scale).toBe(1);
    expect(position.every((n) => Number.isFinite(n))).toBe(true);
  });
});

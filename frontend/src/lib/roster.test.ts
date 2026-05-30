import { describe, it, expect } from "vitest";
import { roster, readyRoster } from "./roster";

describe("roster", () => {
  it("tiene entre 8 y 10 criaturas (criterio de PRO-18)", () => {
    expect(roster.length).toBeGreaterThanOrEqual(8);
    expect(roster.length).toBeLessThanOrEqual(10);
  });

  it("cada entrada tiene slug, name y prompt no vacíos, y slugs únicos", () => {
    const slugs = new Set<string>();
    for (const c of roster) {
      expect(c.slug).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.prompt).toBeTruthy();
      slugs.add(c.slug);
    }
    expect(slugs.size).toBe(roster.length);
  });

  it("readyRoster solo incluye criaturas con .glb hosteado", () => {
    expect(readyRoster.every((c) => c.glb !== null)).toBe(true);
  });
});

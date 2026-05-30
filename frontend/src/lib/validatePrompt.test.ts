import { describe, it, expect } from "vitest";
import {
  validatePrompt,
  PROMPT_MAX_LENGTH,
  PROMPT_MIN_LENGTH,
} from "./validatePrompt";

describe("validatePrompt", () => {
  it("rechaza un prompt vacío", () => {
    const r = validatePrompt("");
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("rechaza un prompt que es solo espacios en blanco", () => {
    const r = validatePrompt("    \n\t  ");
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("rechaza un prompt más corto que el mínimo", () => {
    const r = validatePrompt("a".repeat(PROMPT_MIN_LENGTH - 1));
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("acepta un prompt válido y devuelve la versión trimmeada", () => {
    const r = validatePrompt("  a fire-breathing armored lizard  ");
    expect(r.valid).toBe(true);
    expect(r.error).toBeNull();
    expect(r.trimmed).toBe("a fire-breathing armored lizard");
  });

  it("rechaza un prompt que supera el máximo", () => {
    const r = validatePrompt("a".repeat(PROMPT_MAX_LENGTH + 1));
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("acepta un prompt exactamente en el límite máximo", () => {
    const r = validatePrompt("a".repeat(PROMPT_MAX_LENGTH));
    expect(r.valid).toBe(true);
  });

  it("calcula los caracteres restantes sobre el largo crudo", () => {
    const r = validatePrompt("dragon");
    expect(r.remaining).toBe(PROMPT_MAX_LENGTH - "dragon".length);
  });

  it("reporta restantes negativos cuando se pasa del límite (para feedback de UI)", () => {
    const r = validatePrompt("a".repeat(PROMPT_MAX_LENGTH + 5));
    expect(r.remaining).toBe(-5);
  });
});

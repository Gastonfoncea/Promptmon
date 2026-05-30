/**
 * Validación del prompt de criatura (PRO-15).
 *
 * Nota de diseño: el prompt es SOLO estética — los stats de la criatura salen
 * del contrato on-chain, así que NO validamos "poder" ni balance. Solo evitamos
 * prompts vacíos / triviales / demasiado largos para la API de Tripo.
 */

/** Largo máximo permitido (caracteres). Tripo acepta prompts largos, pero acotamos por UX/costo. */
export const PROMPT_MAX_LENGTH = 200;

/** Largo mínimo útil: menos que esto no describe nada generable. */
export const PROMPT_MIN_LENGTH = 3;

export interface PromptValidation {
  /** true si el prompt se puede enviar a generar. */
  valid: boolean;
  /** El prompt con espacios de borde recortados (lo que se manda a Tripo). */
  trimmed: string;
  /** Caracteres restantes hasta el máximo (negativo si se pasó). Para el contador de la UI. */
  remaining: number;
  /** Mensaje de error legible, o null si es válido. */
  error: string | null;
}

/**
 * Valida un prompt crudo (tal cual lo tipeó el usuario) y devuelve el estado
 * para la UI: si se puede enviar, el texto limpio, los caracteres restantes y
 * un mensaje de error si corresponde.
 */
export function validatePrompt(raw: string): PromptValidation {
  const trimmed = raw.trim();
  const remaining = PROMPT_MAX_LENGTH - raw.length;

  let error: string | null = null;
  if (trimmed.length === 0) {
    error = "Escribí una descripción para tu criatura.";
  } else if (trimmed.length < PROMPT_MIN_LENGTH) {
    error = `Muy corto: al menos ${PROMPT_MIN_LENGTH} caracteres.`;
  } else if (trimmed.length > PROMPT_MAX_LENGTH) {
    error = `Muy largo: máximo ${PROMPT_MAX_LENGTH} caracteres.`;
  }

  return { valid: error === null, trimmed, remaining, error };
}

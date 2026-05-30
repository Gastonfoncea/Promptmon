import { useState, useId, type FormEvent } from "react";
import {
  validatePrompt,
  PROMPT_MAX_LENGTH,
} from "./validatePrompt.js";

const DEFAULT_PLACEHOLDER =
  "a fire-breathing armored lizard, neon cyberpunk style";

export interface PromptInputProps {
  /**
   * Dispara la generación de la criatura a partir del prompt validado (ya trimmeado).
   * DEBE ir contra Tripo del lado del servidor (API route), porque el cliente
   * Tripo lee TRIPO_API_KEY del entorno y no puede correr en el browser.
   * El componente await-ea esta promesa para el feedback de carga y muestra
   * `error.message` si rechaza.
   */
  onGenerate: (prompt: string) => Promise<void>;
  /** Texto del placeholder del textarea. */
  placeholder?: string;
  /** Deshabilita el input desde afuera (ej. wallet no conectada). */
  disabled?: boolean;
  /** Clase CSS opcional para el contenedor (estilos los pone el scaffold de Dev3). */
  className?: string;
}

/**
 * Input de prompt de criatura (PRO-15).
 *
 * Responsabilidades: textarea con contador y límite de caracteres, bloqueo de
 * envío vacío/ inválido, feedback de carga mientras se genera y mensaje de error.
 * Está DESACOPLADO del cliente Tripo vía la prop `onGenerate`, así se monta en
 * el <Canvas>/layout del scaffold (PRO-19) sin exponer la API key en el browser.
 */
export function PromptInput({
  onGenerate,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  className,
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorId = useId();
  const counterId = useId();

  const validation = validatePrompt(value);
  const canSubmit = validation.valid && !isGenerating && !disabled;
  // El contador avisa visualmente cuando quedan pocos / se pasó.
  const counterTone =
    validation.remaining < 0
      ? "over"
      : validation.remaining <= 20
        ? "low"
        : "ok";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsGenerating(true);
    try {
      await onGenerate(validation.trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falló la generación. Probá de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit} data-prompt-input="">
      <textarea
        aria-label="Descripción de tu criatura"
        placeholder={placeholder}
        value={value}
        maxLength={PROMPT_MAX_LENGTH}
        rows={3}
        disabled={isGenerating || disabled}
        aria-invalid={validation.error !== null && value.length > 0}
        aria-describedby={`${counterId} ${error ? errorId : ""}`.trim()}
        onChange={(e) => setValue(e.target.value)}
      />

      <div data-prompt-meta="">
        <span id={counterId} data-counter-tone={counterTone}>
          {validation.remaining} caracteres restantes
        </span>
        <button type="submit" disabled={!canSubmit}>
          {isGenerating ? "Generando…" : "Generar criatura"}
        </button>
      </div>

      {isGenerating && (
        <p role="status" data-prompt-status="">
          Generando tu criatura… esto puede tardar ~1 minuto.
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" data-prompt-error="">
          {error}
        </p>
      )}
    </form>
  );
}

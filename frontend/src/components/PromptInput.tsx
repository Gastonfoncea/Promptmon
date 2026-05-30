"use client";

import { useState, useId, type FormEvent } from "react";
import { validatePrompt, PROMPT_MAX_LENGTH } from "@/lib/validatePrompt";

const DEFAULT_PLACEHOLDER =
  "a fire-breathing armored lizard, neon cyberpunk style";

export interface PromptInputProps {
  /**
   * Dispara la generación de la criatura a partir del prompt validado (ya trimmeado).
   * Va contra `/api/generate` (server-side), porque Tripo lee TRIPO_API_KEY del
   * entorno y no puede correr en el browser. El componente await-ea esta promesa
   * para el feedback de carga y muestra `error.message` si rechaza.
   */
  onGenerate: (prompt: string) => Promise<void>;
  /** Texto del placeholder del textarea. */
  placeholder?: string;
  /** Deshabilita el input desde afuera (ej. wallet no conectada). */
  disabled?: boolean;
  /** Clase CSS opcional para el contenedor. */
  className?: string;
}

/**
 * Input de prompt de criatura (PRO-15).
 *
 * Responsabilidades: textarea con contador y límite de caracteres, bloqueo de
 * envío vacío/ inválido, feedback de carga mientras se genera y mensaje de error.
 * Desacoplado de Tripo vía la prop `onGenerate` (la generación es server-side).
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
  // Generación deshabilitada temporalmente: el botón queda siempre inactivo.
  const canSubmit = false && validation.valid && !isGenerating && !disabled;
  const counterColor =
    validation.remaining < 0
      ? "text-red-400"
      : validation.remaining <= 20
        ? "text-amber-400"
        : "text-white/40";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsGenerating(true);
    try {
      await onGenerate(validation.trimmed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falló la generación. Probá de nuevo.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form
      className={
        className ??
        "flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur"
      }
      onSubmit={handleSubmit}
      data-prompt-input=""
    >
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
        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#836EF9] disabled:opacity-50"
      />

      <div className="flex items-center justify-between gap-3">
        <span id={counterId} className={`text-xs tabular-nums ${counterColor}`}>
          {validation.remaining} caracteres restantes
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-[#836EF9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f5ae0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isGenerating ? "Generando…" : "Generar criatura"}
        </button>
      </div>

      {isGenerating && (
        <p role="status" className="text-xs text-white/60" data-prompt-status="">
          Generando tu criatura… esto puede tardar ~1 minuto.
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red-400"
          data-prompt-error=""
        >
          {error}
        </p>
      )}
    </form>
  );
}

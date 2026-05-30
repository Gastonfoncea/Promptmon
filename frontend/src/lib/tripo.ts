/**
 * Cliente server-side de Tripo (texto → modelo .glb).
 *
 * ⚠️ Versión liviana DERIVADA de `@promptmon/tripo` (PRO-14), vendoreada acá para
 * que Vercel (root del deploy = `frontend/`) la pueda bundlear sin workspace.
 * Si el cliente canónico en `/tripo` cambia su comportamiento, sincronizar.
 *
 * SOLO SERVIDOR: lee TRIPO_API_KEY del entorno. Nunca importar desde un client
 * component — la API key no debe llegar al browser.
 */

const BASE_URL = process.env.TRIPO_API_BASE ?? "https://api.tripo3d.ai/v2/openapi";

const TERMINAL_ERROR_STATES = new Set([
  "failed",
  "cancelled",
  "banned",
  "expired",
  "unknown",
]);

interface TripoEnvelope<T> {
  code: number;
  message?: string;
  suggestion?: string;
  data: T;
}

interface TripoTaskData {
  status: string;
  progress?: number;
  output?: { model?: string; pbr_model?: string };
  result?: { model?: { url?: string }; pbr_model?: { url?: string } };
}

/** Falta de configuración (no hay API key). Se mapea a 500 en la route. */
export class TripoConfigError extends Error {}
/** La generación falló / dio timeout / la API rechazó. Se mapea a 502 en la route. */
export class TripoGenerationError extends Error {}

async function api<T>(
  method: "GET" | "POST",
  path: string,
  apiKey: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    throw new TripoGenerationError(
      `Falló la conexión con Tripo: ${(cause as Error).message}`,
    );
  }

  const text = await res.text();
  let env: TripoEnvelope<T>;
  try {
    env = JSON.parse(text) as TripoEnvelope<T>;
  } catch {
    throw new TripoGenerationError(
      `Respuesta no-JSON de Tripo (HTTP ${res.status}).`,
    );
  }
  if (env.code !== 0) {
    throw new TripoGenerationError(env.message ?? `Tripo devolvió code ${env.code}`);
  }
  return env.data;
}

function extractGlbUrl(task: TripoTaskData): string | null {
  return (
    task.output?.pbr_model ??
    task.output?.model ??
    task.result?.pbr_model?.url ??
    task.result?.model?.url ??
    null
  );
}

export interface GenerateOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  /** Callback de progreso (0-100) en cada poll. Para streamear al frontend. */
  onProgress?: (progress: number, status: string) => void;
}

/**
 * prompt → URL del .glb. POST /task (text_to_model), luego poll hasta success.
 * Lanza TripoConfigError si falta la key, TripoGenerationError en error/timeout.
 */
export async function generateCreature(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<string> {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) {
    throw new TripoConfigError("Falta TRIPO_API_KEY en el entorno del servidor.");
  }

  const clean = prompt.trim();
  if (!clean) throw new TripoGenerationError("El prompt no puede estar vacío.");

  const { task_id } = await api<{ task_id: string }>("POST", "/task", apiKey, {
    type: "text_to_model",
    prompt: clean,
  });

  const timeoutMs = opts.timeoutMs ?? 240_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const task = await api<TripoTaskData>(
      "GET",
      `/task/${encodeURIComponent(task_id)}`,
      apiKey,
    );

    opts.onProgress?.(task.progress ?? 0, task.status);

    if (task.status === "success") {
      const glbUrl = extractGlbUrl(task);
      if (!glbUrl) {
        throw new TripoGenerationError(
          "Tripo terminó en success pero no trajo URL de modelo.",
        );
      }
      return glbUrl;
    }

    if (TERMINAL_ERROR_STATES.has(task.status)) {
      throw new TripoGenerationError(
        `La generación terminó en estado "${task.status}".`,
      );
    }

    if (Date.now() + pollIntervalMs > deadline) {
      throw new TripoGenerationError(
        `Timeout de ${timeoutMs}ms esperando a Tripo.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

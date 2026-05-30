import {
  TripoApiError,
  TripoError,
  TripoTaskFailedError,
  TripoTimeoutError,
} from "./errors.js";
import type {
  TripoCreateTaskData,
  TripoEnvelope,
  TripoTaskData,
  TripoTaskStatus,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.tripo3d.ai/v2/openapi";

/** Estados en los que dejamos de pollear (terminales). */
const TERMINAL_ERROR_STATES: ReadonlySet<TripoTaskStatus> = new Set([
  "failed",
  "cancelled",
  "banned",
  "expired",
  "unknown",
]);

export interface TripoClientConfig {
  /** API key (tsk_...). Default: process.env.TRIPO_API_KEY. */
  apiKey?: string;
  /** Base URL de la API. Default: process.env.TRIPO_API_BASE o el host oficial. */
  baseUrl?: string;
  /** fetch a usar (inyectable para tests). Default: globalThis.fetch. */
  fetch?: typeof fetch;
}

export interface GenerateOptions {
  /** Tiempo máximo total de espera en ms. Default: 240000 (4 min). */
  timeoutMs?: number;
  /** Intervalo entre polls en ms. Default: 3000. */
  pollIntervalMs?: number;
  /** Callback de progreso (0-100) en cada poll. */
  onProgress?: (progress: number, status: TripoTaskStatus) => void;
  /** Para cancelar desde afuera (ej. el usuario navega a otra pantalla). */
  signal?: AbortSignal;
}

/** Resultado detallado de una generación exitosa. */
export interface GeneratedCreature {
  /** URL del modelo 3D listo para cargar en R3F (Dev2/PRO-16). */
  glbUrl: string;
  /** Preview render (webp) si la API lo devolvió. */
  renderedImageUrl?: string;
  taskId: string;
  consumedCredit?: number;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error("aborted"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason ?? new Error("aborted"));
      },
      { once: true },
    );
  });

/** Extrae la URL del .glb del estado de la task, probando los campos conocidos por prioridad. */
function extractGlbUrl(task: TripoTaskData): string | null {
  const out = task.output ?? {};
  if (out.pbr_model) return out.pbr_model;
  if (out.model) return out.model;
  const res = task.result ?? {};
  if (res.pbr_model?.url) return res.pbr_model.url;
  if (res.model?.url) return res.model.url;
  return null;
}

export class TripoClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: TripoClientConfig = {}) {
    const apiKey = config.apiKey ?? process.env.TRIPO_API_KEY;
    if (!apiKey) {
      throw new TripoError(
        "Falta la API key de Tripo. Pasá { apiKey } o definí TRIPO_API_KEY en el entorno.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (
      config.baseUrl ??
      process.env.TRIPO_API_BASE ??
      DEFAULT_BASE_URL
    ).replace(/\/$/, "");
    this.fetchFn = config.fetch ?? globalThis.fetch;
    if (!this.fetchFn) {
      throw new TripoError(
        "No hay fetch disponible. Usá Node >=18 o pasá un fetch en la config.",
      );
    }
  }

  /** POST /task con type text_to_model. Devuelve el task_id para pollear. */
  async createTextToModelTask(prompt: string): Promise<string> {
    const clean = prompt.trim();
    if (!clean) throw new TripoError("El prompt no puede estar vacío.");

    const env = await this.request<TripoCreateTaskData>("POST", "/task", {
      type: "text_to_model",
      prompt: clean,
    });
    return env.data.task_id;
  }

  /** GET /task/{id}. Devuelve el estado completo de la task. */
  async getTask(taskId: string): Promise<TripoTaskData> {
    const env = await this.request<TripoTaskData>(
      "GET",
      `/task/${encodeURIComponent(taskId)}`,
    );
    return env.data;
  }

  /**
   * Pollea una task hasta que termine y devuelve el detalle con la URL del .glb.
   * Lanza TripoTimeoutError / TripoTaskFailedError según corresponda.
   */
  async waitForCompletion(
    taskId: string,
    options: GenerateOptions = {},
  ): Promise<GeneratedCreature> {
    const timeoutMs = options.timeoutMs ?? 240_000;
    const pollIntervalMs = options.pollIntervalMs ?? 3_000;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      if (options.signal?.aborted) {
        throw options.signal.reason ?? new TripoError("Generación cancelada.");
      }

      const task = await this.getTask(taskId);
      options.onProgress?.(task.progress ?? 0, task.status);

      if (task.status === "success") {
        const glbUrl = extractGlbUrl(task);
        if (!glbUrl) {
          throw new TripoError(
            `La task ${taskId} terminó en success pero no trajo URL de modelo.`,
          );
        }
        return {
          glbUrl,
          renderedImageUrl:
            task.output?.rendered_image ?? task.result?.rendered_image?.url,
          taskId,
          consumedCredit: task.consumed_credit,
        };
      }

      if (TERMINAL_ERROR_STATES.has(task.status)) {
        throw new TripoTaskFailedError(taskId, task.status);
      }

      // queued / running → seguir esperando, salvo que se agote el tiempo.
      if (Date.now() + pollIntervalMs > deadline) {
        throw new TripoTimeoutError(taskId, timeoutMs);
      }
      await sleep(pollIntervalMs, options.signal);
    }
  }

  /** Hace una request a la API y valida el envelope (code 0). */
  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<TripoEnvelope<T>> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (cause) {
      throw new TripoError(
        `Falló la conexión con Tripo (${method} ${path}): ${(cause as Error).message}`,
      );
    }

    const text = await res.text();
    let env: TripoEnvelope<T>;
    try {
      env = JSON.parse(text) as TripoEnvelope<T>;
    } catch {
      throw new TripoApiError(
        `Respuesta no-JSON de Tripo (HTTP ${res.status}): ${text.slice(0, 200)}`,
        res.status,
      );
    }

    if (env.code !== 0) {
      throw new TripoApiError(
        env.message ?? `Tripo devolvió code ${env.code}`,
        env.code,
        env.suggestion,
      );
    }
    return env;
  }
}

/**
 * Función de conveniencia: prompt → URL del .glb.
 * Es la firma que pide PRO-14: generateCreature(prompt): Promise<string glbUrl>.
 */
export async function generateCreature(
  prompt: string,
  options: GenerateOptions & TripoClientConfig = {},
): Promise<string> {
  const { glbUrl } = await generateCreatureDetailed(prompt, options);
  return glbUrl;
}

/** Igual que generateCreature pero devuelve el detalle completo (preview, taskId, créditos). */
export async function generateCreatureDetailed(
  prompt: string,
  options: GenerateOptions & TripoClientConfig = {},
): Promise<GeneratedCreature> {
  const client = new TripoClient(options);
  const taskId = await client.createTextToModelTask(prompt);
  return client.waitForCompletion(taskId, options);
}

/**
 * Tipos de la API de Tripo (/v2/openapi).
 * Derivados de respuestas reales del endpoint text_to_model.
 */

/** Estados posibles de una task. Los terminales-OK / terminales-error se manejan distinto. */
export type TripoTaskStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "cancelled"
  | "banned"
  | "expired"
  | "unknown";

/** Sobre genérico de toda respuesta de la API: code 0 = OK. */
export interface TripoEnvelope<T> {
  code: number;
  message?: string;
  suggestion?: string;
  data: T;
}

/** Respuesta del POST /task: solo trae el id para pollear. */
export interface TripoCreateTaskData {
  task_id: string;
}

/** Archivo dentro de `result` (url + tipo, ej. glb/webp). */
export interface TripoResultFile {
  url: string;
  type?: string;
}

/** Estado completo de una task devuelto por GET /task/{id}. */
export interface TripoTaskData {
  task_id: string;
  type: string;
  status: TripoTaskStatus;
  progress: number;
  input?: Record<string, unknown>;
  /** URLs sueltas: pbr_model / model son el GLB; generated_image / rendered_image son previews. */
  output?: {
    model?: string;
    pbr_model?: string;
    generated_image?: string;
    rendered_image?: string;
  };
  /** Misma info que output pero estructurada con {url,type}. */
  result?: {
    model?: TripoResultFile;
    pbr_model?: TripoResultFile;
    rendered_image?: TripoResultFile;
  };
  consumed_credit?: number;
  estimated_running_time?: number;
  running_left_time?: number;
  create_time?: number;
}

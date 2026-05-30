import type { TripoTaskStatus } from "./types.js";

/** Error base del cliente de Tripo. Permite `catch` tipado en el frontend. */
export class TripoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripoError";
  }
}

/** La API respondió con code !== 0 (key inválida, sin crédito, body mal formado, etc.). */
export class TripoApiError extends TripoError {
  constructor(
    message: string,
    readonly code: number,
    readonly suggestion?: string,
  ) {
    super(message);
    this.name = "TripoApiError";
  }
}

/** La generación terminó en un estado de error (failed/banned/expired/cancelled). */
export class TripoTaskFailedError extends TripoError {
  constructor(
    readonly taskId: string,
    readonly status: TripoTaskStatus,
  ) {
    super(`La task ${taskId} terminó en estado "${status}".`);
    this.name = "TripoTaskFailedError";
  }
}

/** Se agotó el tiempo de espera sin que la generación terminara. */
export class TripoTimeoutError extends TripoError {
  constructor(
    readonly taskId: string,
    readonly timeoutMs: number,
  ) {
    super(
      `La task ${taskId} no terminó dentro de ${Math.round(timeoutMs / 1000)}s. ` +
        `Sigue generándose en el server; reintentá pollear o subí el timeout.`,
    );
    this.name = "TripoTimeoutError";
  }
}

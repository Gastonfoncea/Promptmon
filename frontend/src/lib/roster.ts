/**
 * Roster pre-generado de criaturas (PRO-18): seed de la arena + red de seguridad
 * de la demo (si Tripo/wifi fallan en vivo, estas ya están listas y hosteadas).
 *
 * Los datos salen de `roster.manifest.json`, que genera `tripo/`:
 *   cd tripo && pnpm roster
 * Ese script baja los `.glb` a `frontend/public/roster/` (Next los sirve estáticos,
 * no expiran) y completa el `glb` de cada entrada acá.
 */
import manifest from "./roster.manifest.json";

export interface RosterEntry {
  slug: string;
  name: string;
  prompt: string;
  /** Ruta pública del modelo servido por Next (ej. "/roster/ember-drake.glb"), o null si falta generar. */
  glb: string | null;
  /** Preview render (webp) de Tripo, si lo devolvió. */
  preview: string | null;
  taskId: string | null;
  generatedAt: string | null;
}

/** Todas las entradas del roster (incluidas las que falta generar). */
export const roster: RosterEntry[] = manifest as unknown as RosterEntry[];

/**
 * Solo las criaturas ya generadas y hosteadas localmente (con `.glb`).
 * Son las que se pueden mostrar en la arena sin depender de la API en vivo.
 */
export const readyRoster: RosterEntry[] = roster.filter(
  (creature): creature is RosterEntry & { glb: string } => creature.glb !== null,
);

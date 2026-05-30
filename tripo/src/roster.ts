/**
 * Generador del ROSTER pre-generado (PRO-18).
 *
 * Genera un set fijo de criaturas con Tripo, baja sus `.glb` a
 * `frontend/public/roster/` (Next las sirve estáticas → no expiran ni dependen
 * de la API en vivo) y escribe un manifest importable por el frontend.
 *
 * Uso:
 *   pnpm roster            genera SOLO las que falten (resumible)
 *   pnpm roster --force    regenera todas
 *
 * Lee TRIPO_API_KEY / TRIPO_API_BASE de ../.env.local (raíz del repo).
 * Free tier de Tripo = 1 tarea concurrente → se generan de a una, secuencial.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { generateCreatureDetailed } from "./client.js";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");
const MANIFEST_PATH = resolve(REPO_ROOT, "frontend/src/lib/roster.manifest.json");
const GLB_DIR = resolve(REPO_ROOT, "frontend/public/roster");

interface RosterSeed {
  slug: string;
  name: string;
  prompt: string;
}

interface RosterEntry extends RosterSeed {
  /** Ruta pública servida por Next (ej. "/roster/ember-drake.glb"), o null si falta generar. */
  glb: string | null;
  /** Preview render (webp) de Tripo, si lo devolvió. */
  preview: string | null;
  taskId: string | null;
  generatedAt: string | null;
}

/**
 * El roster: prompts variados para que la arena se vea diversa y como red de
 * seguridad de la demo. El prompt es solo estética (los stats salen del contrato).
 */
const ROSTER: RosterSeed[] = [
  { slug: "ember-drake", name: "Ember Drake", prompt: "a fire-breathing armored lizard, molten cracks glowing through obsidian scales, cinematic" },
  { slug: "frost-warden", name: "Frost Warden", prompt: "an icy crystalline golem with glacier shards for armor, pale blue glow" },
  { slug: "neon-serpent", name: "Neon Serpent", prompt: "a sleek cyberpunk snake with neon circuit patterns and chrome plating" },
  { slug: "storm-griffin", name: "Storm Griffin", prompt: "a majestic griffin crackling with lightning, storm clouds around its wings" },
  { slug: "abyss-jelly", name: "Abyss Jelly", prompt: "a bioluminescent deep-sea jellyfish creature, translucent body, glowing tendrils" },
  { slug: "solar-phoenix", name: "Solar Phoenix", prompt: "a cosmic phoenix made of solar flares and golden plasma, radiant" },
  { slug: "moss-treant", name: "Moss Treant", prompt: "a small ancient tree spirit covered in moss and tiny mushrooms, gentle" },
  { slug: "void-stalker", name: "Void Stalker", prompt: "a shadowy panther-like creature wreathed in dark cosmic smoke, purple star specks" },
  { slug: "crystal-mantis", name: "Crystal Mantis", prompt: "a praying mantis made of faceted amethyst crystal, sharp and elegant" },
  { slug: "magma-toad", name: "Magma Toad", prompt: "a chunky toad with cracked volcanic rock skin and lava veins, grumpy" },
];

/** Carga mínima de .env.local sin dependencias externas (igual que el CLI de PRO-14). */
function loadEnvLocal(): void {
  const envPath = resolve(REPO_ROOT, ".env.local");
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return; // si no existe, asumimos que las vars ya están en el entorno
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

function readManifest(): RosterEntry[] {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as RosterEntry[];
  } catch {
    return [];
  }
}

function writeManifest(entries: RosterEntry[]): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2) + "\n");
}

async function downloadGlb(url: string, slug: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo bajar el .glb (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(GLB_DIR, { recursive: true });
  writeFileSync(resolve(GLB_DIR, `${slug}.glb`), buf);
  return `/roster/${slug}.glb`;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const force = process.argv.includes("--force");

  // Mergeamos las seeds con lo ya generado (resumible): conservamos los .glb existentes.
  const bySlug = new Map(readManifest().map((e) => [e.slug, e]));
  const manifest: RosterEntry[] = ROSTER.map(
    (seed) =>
      bySlug.get(seed.slug) ?? {
        ...seed,
        glb: null,
        preview: null,
        taskId: null,
        generatedAt: null,
      },
  );
  writeManifest(manifest); // deja todas las seeds en el manifest (pending si no están)

  for (const entry of manifest) {
    if (entry.glb && !force) {
      console.log(`✓ ${entry.name} (ya estaba)`);
      continue;
    }
    console.log(`→ ${entry.name}: "${entry.prompt}"`);
    try {
      const creature = await generateCreatureDetailed(entry.prompt, {
        onProgress: (p, s) => process.stdout.write(`\r  ${s.padEnd(8)} ${p}%   `),
      });
      entry.glb = await downloadGlb(creature.glbUrl, entry.slug);
      entry.preview = creature.renderedImageUrl ?? null;
      entry.taskId = creature.taskId;
      entry.generatedAt = new Date().toISOString();
      writeManifest(manifest); // guarda tras cada una → resumible si se corta
      console.log(`\n  ✅ ${entry.glb}`);
    } catch (err) {
      console.error(`\n  ❌ ${(err as Error).message}`);
    }
  }

  const ready = manifest.filter((e) => e.glb).length;
  console.log(`\nRoster: ${ready}/${manifest.length} criaturas listas → ${MANIFEST_PATH}`);
  if (ready < manifest.length) {
    console.log("Volvé a correr `pnpm roster` para reintentar las que faltan.");
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err?.name ?? "Error"}: ${err?.message ?? err}`);
  process.exitCode = 1;
});

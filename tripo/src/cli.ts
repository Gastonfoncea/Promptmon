/**
 * CLI de prueba para PRO-14.
 * Uso:  pnpm gen "a fire-breathing armored lizard"
 * Lee TRIPO_API_KEY / TRIPO_API_BASE de ../.env.local (raíz del repo).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { generateCreatureDetailed } from "./client.js";

/** Carga mínima de .env.local sin dependencias externas. */
function loadEnvLocal(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, "../../.env.local");
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

async function main() {
  loadEnvLocal();

  const prompt = process.argv.slice(2).join(" ").trim() || "a small cute dragon";
  console.log(`→ Generando: "${prompt}"`);
  const startedAt = Date.now();

  const creature = await generateCreatureDetailed(prompt, {
    onProgress: (progress, status) => {
      process.stdout.write(`\r  ${status.padEnd(8)} ${progress}%   `);
    },
  });

  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n✅ Listo en ${secs}s (créditos: ${creature.consumedCredit ?? "?"})`);
  console.log(`   taskId:  ${creature.taskId}`);
  console.log(`   glbUrl:  ${creature.glbUrl}`);
  if (creature.renderedImageUrl) {
    console.log(`   preview: ${creature.renderedImageUrl}`);
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err.name ?? "Error"}: ${err.message}`);
  process.exitCode = 1;
});

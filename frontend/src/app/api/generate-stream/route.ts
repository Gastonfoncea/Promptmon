import { generateCreature, TripoConfigError } from "@/lib/tripo";
import { validatePrompt } from "@/lib/validatePrompt";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/generate-stream  { prompt }  →  stream NDJSON
 *
 * Emite una línea JSON por evento mientras Tripo genera:
 *   {"progress": 0-100, "status": "running"}   (varias)
 *   {"glbUrl": "..."}                           (al terminar OK)
 *   {"error": "..."}                            (si falla)
 *
 * Permite mostrar una barra de progreso REAL en el frontend en vez de un spinner
 * ciego durante los ~60-90s de generación.
 */
export async function POST(req: Request) {
  let prompt: unknown;
  try {
    prompt = (await req.json())?.prompt;
  } catch {
    prompt = undefined;
  }

  const validation =
    typeof prompt === "string" ? validatePrompt(prompt) : null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      if (!validation || !validation.valid) {
        send({ error: validation?.error ?? "Prompt inválido." });
        controller.close();
        return;
      }

      try {
        const glbUrl = await generateCreature(validation.trimmed, {
          onProgress: (progress, status) => send({ progress, status }),
        });
        send({ glbUrl });
      } catch (err) {
        const msg =
          err instanceof TripoConfigError
            ? "Tripo no está configurado en el servidor."
            : err instanceof Error
              ? err.message
              : "Falló la generación.";
        send({ error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

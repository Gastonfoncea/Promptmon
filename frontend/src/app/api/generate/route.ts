import { NextResponse } from "next/server";
import { generateCreature, TripoConfigError } from "@/lib/tripo";
import { validatePrompt } from "@/lib/validatePrompt";

// Generar puede tardar ~45-90s; corremos en Node (no Edge) y pedimos más tiempo.
// OJO: en Vercel Hobby el tope es bajo (~60s). Para la demo en vivo el roster
// pre-generado (PRO-18) es la red de seguridad si esto se corta.
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/generate  { prompt: string }  →  { glbUrl: string }
 *
 * Llama a Tripo del lado servidor (lee TRIPO_API_KEY). La validación se repite
 * acá: nunca confiamos en la del browser. El glbUrl resultante alimenta a PRO-16.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido (se esperaba JSON)." }, { status: 400 });
  }

  const prompt = (body as { prompt?: unknown })?.prompt;
  if (typeof prompt !== "string") {
    return NextResponse.json({ error: "Falta el campo 'prompt'." }, { status: 400 });
  }

  const validation = validatePrompt(prompt);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const glbUrl = await generateCreature(validation.trimmed);
    return NextResponse.json({ glbUrl });
  } catch (err) {
    if (err instanceof TripoConfigError) {
      // Problema de config del server, no del usuario.
      return NextResponse.json(
        { error: "Tripo no está configurado en el servidor." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falló la generación." },
      { status: 502 },
    );
  }
}

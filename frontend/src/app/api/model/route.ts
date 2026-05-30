import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Hosts de Tripo permitidos (evita open-proxy / SSRF). */
const ALLOWED_HOSTS = [".tripo3d.com", ".tripo3d.ai"];

/**
 * GET /api/model?url=<glbUrl de Tripo>
 *
 * Proxea el .glb de Tripo desde nuestro propio origen para esquivar CORS:
 * el CDN de Tripo no manda Access-Control-Allow-Origin, así que el browser no
 * puede cargar el modelo directo con GLTFLoader. Lo bajamos server-side (sin
 * CORS) y lo reenviamos.
 */
export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Falta ?url=" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  const ok =
    parsed.protocol === "https:" &&
    ALLOWED_HOSTS.some((h) => parsed.hostname.endsWith(h));
  if (!ok) {
    return NextResponse.json({ error: "Host no permitido." }, { status: 403 });
  }

  const upstream = await fetch(target);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status}` },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "model/gltf-binary",
      // Los links de Tripo expiran (~24h); cacheamos un rato pero no de más.
      "Cache-Control": "public, max-age=3600",
    },
  });
}

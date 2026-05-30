/**
 * Devuelve la URL a usar en GLTFLoader para un modelo de Tripo.
 * Los .glb de Tripo se sirven desde un CDN sin CORS → no se pueden cargar
 * directo en el browser. Los ruteamos por /api/model (mismo origen).
 * URLs que ya son locales/relativas se devuelven tal cual.
 */
export function proxiedModelUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return url;
  return `/api/model?url=${encodeURIComponent(url)}`;
}

/**
 * Normalización de un modelo 3D para mostrarlo centrado y a escala uniforme (PRO-16).
 *
 * Los modelos de Tripo vienen en escalas y posiciones arbitrarias. Para que
 * cualquier `glbUrl` se vea igual de encuadrado calculamos, a partir de su
 * bounding box, un `scale` que lleva su dimensión más grande a `targetSize` y
 * una `position` que deja su centro en el origen (0,0,0).
 *
 * Pura y sin three.js: testeable sin WebGL. El componente le pasa los números
 * de un THREE.Box3 y aplica el resultado a un <group>.
 */

export type Vec3 = [number, number, number];

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

export interface FitTransform {
  /** Factor de escala uniforme a aplicar al group. */
  scale: number;
  /** Posición del group para que el modelo quede centrado en el origen (post-escala). */
  position: Vec3;
}

/**
 * Dado el bounding box del modelo (en sus coordenadas originales), devuelve el
 * scale + position para que su dimensión mayor mida `targetSize` y su centro
 * quede en el origen.
 *
 * Para un group con scale S y position P, un vértice v se renderiza en P + S·v.
 * Queremos P + S·center = 0  →  P = -S·center.
 */
export function computeFitTransform(
  box: BoundingBox,
  targetSize = 2,
): FitTransform {
  const sizeX = box.max[0] - box.min[0];
  const sizeY = box.max[1] - box.min[1];
  const sizeZ = box.max[2] - box.min[2];
  const maxDim = Math.max(sizeX, sizeY, sizeZ);

  // Modelo degenerado (vacío o de tamaño cero) → no escalar, evitar division/NaN.
  const scale = maxDim > 0 ? targetSize / maxDim : 1;

  const centerX = (box.min[0] + box.max[0]) / 2;
  const centerY = (box.min[1] + box.max[1]) / 2;
  const centerZ = (box.min[2] + box.max[2]) / 2;

  return {
    scale,
    position: [-centerX * scale, -centerY * scale, -centerZ * scale],
  };
}

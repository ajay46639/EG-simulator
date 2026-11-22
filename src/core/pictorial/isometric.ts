import { MeshData, Vec2, Vec3 } from '../../types/engineering';
import { dot } from '../../geometry/math';

export type IsometricMode = 'projection' | 'drawing';

export interface PictorialEdge2D {
  start: Vec2;
  end: Vec2;
  visible: boolean;
  kind: 'visible' | 'hidden' | 'axis';
}

export interface PictorialOutput {
  title: string;
  subtitle: string;
  edges: PictorialEdge2D[];
  axes: Array<{ label: string; from: Vec2; to: Vec2; color: string }>;
  bounds: { minU: number; maxU: number; minV: number; maxV: number };
}

/** N.D. Bhatt Ch. 17 Isometric Scale factor = sqrt(2/3) ≈ 0.81649658 */
export const ISOMETRIC_SCALE = Math.sqrt(2 / 3);

/**
 * Project 3D engineering coordinates (X, Y, Z) onto Isometric 2D plane:
 * - X axis goes right-up at +30°
 * - Y axis goes left-up at +150° (or right-down depending on handedness)
 * - Z axis goes straight vertical (+90°)
 */
export function projectIsometricPoint(p: Vec3, mode: IsometricMode = 'projection'): Vec2 {
  const s = mode === 'projection' ? ISOMETRIC_SCALE : 1.0;
  const c30 = Math.cos(Math.PI / 6); // 0.8660254
  const s30 = 0.5;
  return {
    u: s * (p.x - p.y) * c30,
    v: s * ((p.x + p.y) * s30 + p.z),
  };
}

export function buildIsometricView(
  mesh: MeshData,
  mode: IsometricMode = 'projection',
  objectName = 'Solid'
): PictorialOutput {
  // Isometric camera looks from (+1, +1, +1) toward origin
  const invSqrt3 = 1 / Math.sqrt(3);
  const viewDir: Vec3 = { x: invSqrt3, y: invSqrt3, z: invSqrt3 };

  const faceFront = mesh.faces.map((f) => dot(f.normal, viewDir) > 1e-4);
  const edges: PictorialEdge2D[] = [];

  for (const e of mesh.edges) {
    const start = projectIsometricPoint(e.start, mode);
    const end = projectIsometricPoint(e.end, mode);
    if (e.kind === 'axis') {
      edges.push({ start, end, visible: true, kind: 'axis' });
      continue;
    }
    if (e.smooth && e.faceIndices && e.faceIndices.length >= 2) {
      const hasF = e.faceIndices.some((fi) => faceFront[fi]);
      const hasB = e.faceIndices.some((fi) => !faceFront[fi]);
      if (!(hasF && hasB)) continue;
    }
    const vis =
      mesh.faces.length === 0 || !e.faceIndices || e.faceIndices.length === 0
        ? true
        : e.faceIndices.some((fi) => faceFront[fi]);
    edges.push({ start, end, visible: vis, kind: vis ? 'visible' : 'hidden' });
  }

  // Sort hidden behind visible
  const order = { axis: 0, hidden: 1, visible: 2 };
  edges.sort((a, b) => order[a.kind] - order[b.kind]);

  // Isometric reference triad at bounding-box min corner
  const o3 = mesh.boundingBox.min;
  const len = 30;
  const o2 = projectIsometricPoint(o3, mode);
  const axes = [
    { label: 'X (30°)', from: o2, to: projectIsometricPoint({ x: o3.x + len, y: o3.y, z: o3.z }, mode), color: '#ef4444' },
    { label: 'Y (150°)', from: o2, to: projectIsometricPoint({ x: o3.x, y: o3.y + len, z: o3.z }, mode), color: '#22c55e' },
    { label: 'Z (90°)', from: o2, to: projectIsometricPoint({ x: o3.x, y: o3.y, z: o3.z + len }, mode), color: '#3b82f6' },
  ];

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const e of edges) {
    minU = Math.min(minU, e.start.u, e.end.u);
    maxU = Math.max(maxU, e.start.u, e.end.u);
    minV = Math.min(minV, e.start.v, e.end.v);
    maxV = Math.max(maxV, e.start.v, e.end.v);
  }
  if (!Number.isFinite(minU)) {
    minU = -50; maxU = 50; minV = -50; maxV = 50;
  }

  return {
    title: `${objectName} — Isometric ${mode === 'projection' ? 'Projection (Scale 0.8165)' : 'Drawing (True Scale 1:1)'}`,
    subtitle: `N.D. Bhatt Ch. 17 | Axes at 30° / 150° / 90° | Scale = ${mode === 'projection' ? '√(2/3) ≈ 0.8165' : '1.000'}`,
    edges,
    axes,
    bounds: { minU, maxU, minV, maxV },
  };
}

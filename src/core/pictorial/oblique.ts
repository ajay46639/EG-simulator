import { MeshData, Vec2, Vec3 } from '../../types/engineering';
import { dot } from '../../geometry/math';
import { PictorialEdge2D, PictorialOutput } from './isometric';

export type ObliqueMode = 'cavalier' | 'cabinet';

/**
 * Project 3D engineering point (X, Y, Z) onto Oblique 2D plane (N.D. Bhatt Ch. 18):
 * - Front face (X, Z) is shown in true shape and size
 * - Receding depth axis (+Y) projects at recedingAngleDeg (30°, 45°, or 60°)
 * - Cavalier scale = 1.0 (full depth); Cabinet scale = 0.5 (half depth)
 */
export function projectObliquePoint(
  p: Vec3,
  mode: ObliqueMode = 'cabinet',
  recedingAngleDeg = 45
): Vec2 {
  const depthScale = mode === 'cavalier' ? 1.0 : 0.5;
  const rad = (recedingAngleDeg * Math.PI) / 180;
  return {
    u: p.x + p.y * depthScale * Math.cos(rad),
    v: p.z + p.y * depthScale * Math.sin(rad),
  };
}

export function buildObliqueView(
  mesh: MeshData,
  mode: ObliqueMode = 'cabinet',
  recedingAngleDeg = 45,
  objectName = 'Solid'
): PictorialOutput {
  const rad = (recedingAngleDeg * Math.PI) / 180;
  // View ray looks obliquely onto front (+Y) slightly from right/top
  const viewDir: Vec3 = { x: -Math.cos(rad) * 0.4, y: 1, z: -Math.sin(rad) * 0.4 };
  const faceFront = mesh.faces.map((f) => dot(f.normal, viewDir) > 1e-4);

  const edges: PictorialEdge2D[] = [];
  for (const e of mesh.edges) {
    const start = projectObliquePoint(e.start, mode, recedingAngleDeg);
    const end = projectObliquePoint(e.end, mode, recedingAngleDeg);
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

  const order = { axis: 0, hidden: 1, visible: 2 };
  edges.sort((a, b) => order[a.kind] - order[b.kind]);

  const o3 = mesh.boundingBox.min;
  const len = 30;
  const o2 = projectObliquePoint(o3, mode, recedingAngleDeg);
  const axes = [
    { label: 'X (0°)', from: o2, to: projectObliquePoint({ x: o3.x + len, y: o3.y, z: o3.z }, mode, recedingAngleDeg), color: '#ef4444' },
    { label: `Y (${recedingAngleDeg}°)`, from: o2, to: projectObliquePoint({ x: o3.x, y: o3.y + len, z: o3.z }, mode, recedingAngleDeg), color: '#22c55e' },
    { label: 'Z (90°)', from: o2, to: projectObliquePoint({ x: o3.x, y: o3.y, z: o3.z + len }, mode, recedingAngleDeg), color: '#3b82f6' },
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
    title: `${objectName} — Oblique ${mode === 'cavalier' ? 'Cavalier (Full Depth)' : 'Cabinet (Half Depth)'}`,
    subtitle: `N.D. Bhatt Ch. 18 | Receding Axis = ${recedingAngleDeg}° | Scale = ${mode === 'cavalier' ? '1.0' : '0.5'}`,
    edges,
    axes,
    bounds: { minU, maxU, minV, maxV },
  };
}

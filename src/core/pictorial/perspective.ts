import { MeshData, Vec2, Vec3 } from '../../types/engineering';
import { dot, sub } from '../../geometry/math';
import { PictorialEdge2D, PictorialOutput } from './isometric';

export interface PerspectiveParams {
  stationDistFromPP: number; // Distance of Station Point S in front of Picture Plane PP (mm)
  eyeHeightAboveGP: number; // Height of Horizon Line (HL) above Ground Plane (GP) (mm)
  stationOffsetX: number; // Lateral offset of Central Plane (CP) from object center (mm)
  objectYawDeg: number; // 0° = 1-point parallel perspective; 30°/45° = 2-point angular perspective
}

/**
 * Exact Visual-Ray Perspective Projection (N.D. Bhatt Ch. 19):
 * Picture Plane (PP) sits at Y = 0; Station Point S is at (sx, +D, h_eye);
 * Object sits behind PP (Y <= 0). Visual ray from S to P intersects PP (Y = 0)!
 */
export function projectPerspectivePoint(pBehindPP: Vec3, sp: Vec3): Vec2 {
  const denom = sp.y - pBehindPP.y;
  const safeDenom = Math.max(1e-2, denom);
  const t = sp.y / safeDenom;
  return {
    u: sp.x + t * (pBehindPP.x - sp.x),
    v: sp.z + t * (pBehindPP.z - sp.z),
  };
}

export function buildPerspectiveView(
  mesh: MeshData,
  params: PerspectiveParams,
  objectName = 'Solid'
): PictorialOutput {
  const cx = (mesh.boundingBox.min.x + mesh.boundingBox.max.x) / 2;
  const cy = (mesh.boundingBox.min.y + mesh.boundingBox.max.y) / 2;
  const yawRad = (params.objectYawDeg * Math.PI) / 180;
  const cY = Math.cos(yawRad), sY = Math.sin(yawRad);

  // Rotate object around Z by objectYawDeg and place behind Picture Plane (PP at Y = 0)
  const placeBehindPP = (v: Vec3): Vec3 => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    const rx = dx * cY - dy * sY;
    const ry = dx * sY + dy * cY;
    return { x: rx, y: ry - 60, z: v.z };
  };

  const sp: Vec3 = {
    x: params.stationOffsetX,
    y: Math.max(40, params.stationDistFromPP),
    z: params.eyeHeightAboveGP,
  };

  const placedVerts = mesh.vertices.map(placeBehindPP);
  const edges: PictorialEdge2D[] = [];

  for (const e of mesh.edges) {
    const pA = placeBehindPP(e.start);
    const pB = placeBehindPP(e.end);
    const start = projectPerspectivePoint(pA, sp);
    const end = projectPerspectivePoint(pB, sp);
    if (e.kind === 'axis') {
      edges.push({ start, end, visible: true, kind: 'axis' });
      continue;
    }
    if (e.smooth && e.faceIndices && e.faceIndices.length >= 2) {
      const fVis = (fi: number) => {
        const f = mesh.faces[fi];
        const v0 = placedVerts[f.indices[0]];
        const nRot: Vec3 = {
          x: f.normal.x * cY - f.normal.y * sY,
          y: f.normal.x * sY + f.normal.y * cY,
          z: f.normal.z,
        };
        return dot(nRot, sub(sp, v0)) > 0;
      };
      const hasF = e.faceIndices.some(fVis);
      const hasB = e.faceIndices.some((fi) => !fVis(fi));
      if (!(hasF && hasB)) continue;
    }
    let vis = true;
    if (mesh.faces.length > 0 && e.faceIndices && e.faceIndices.length > 0) {
      vis = e.faceIndices.some((fi) => {
        const f = mesh.faces[fi];
        const v0 = placedVerts[f.indices[0]];
        const nRot: Vec3 = {
          x: f.normal.x * cY - f.normal.y * sY,
          y: f.normal.x * sY + f.normal.y * cY,
          z: f.normal.z,
        };
        return dot(nRot, sub(sp, v0)) > 0;
      });
    }
    edges.push({ start, end, visible: vis, kind: vis ? 'visible' : 'hidden' });
  }

  const order = { axis: 0, hidden: 1, visible: 2 };
  edges.sort((a, b) => order[a.kind] - order[b.kind]);

  let minU = Infinity, maxU = -Infinity, minV = 0, maxV = Math.max(60, params.eyeHeightAboveGP + 15);
  for (const e of edges) {
    minU = Math.min(minU, e.start.u, e.end.u);
    maxU = Math.max(maxU, e.start.u, e.end.u);
    minV = Math.min(minV, e.start.v, e.end.v);
    maxV = Math.max(maxV, e.start.v, e.end.v);
  }
  if (!Number.isFinite(minU)) {
    minU = -80; maxU = 80;
  }

  // Horizon Line (HL) & Ground Line (GL)
  const axes = [
    { label: 'HL (Horizon)', from: { u: minU - 25, v: params.eyeHeightAboveGP }, to: { u: maxU + 25, v: params.eyeHeightAboveGP }, color: '#38bdf8' },
    { label: 'GL (Ground)', from: { u: minU - 25, v: 0 }, to: { u: maxU + 25, v: 0 }, color: '#f59e0b' },
  ];

  const modeLabel = Math.abs(params.objectYawDeg) < 0.5 ? '1-Point Parallel' : `2-Point Angular (${params.objectYawDeg}°)`;
  return {
    title: `${objectName} — ${modeLabel} Perspective`,
    subtitle: `N.D. Bhatt Ch. 19 | Station S: ${params.stationDistFromPP}mm front of PP, Eye H=${params.eyeHeightAboveGP}mm`,
    edges,
    axes,
    bounds: { minU: minU - 25, maxU: maxU + 25, minV: minV - 10, maxV: maxV + 10 },
  };
}

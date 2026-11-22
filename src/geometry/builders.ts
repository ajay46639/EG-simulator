import {
  CurveParams,
  Edge3D,
  EngineeringObject,
  Face3D,
  MeshData,
  PlaneParams,
  SectionPlaneInfo,
  SolidParams,
  SolverResult,
  Vec3,
} from '../types/engineering';
import {
  computeBoundingBox,
  cross,
  mat4EulerXYZ,
  mat4Identity,
  mat4Multiply,
  mat4RotationX,
  mat4RotationY,
  mat4RotationZ,
  mat4Translation,
  normalize,
  sub,
  transformPoint,
  vec3,
} from './math';
import {
  getSolidBaseRadius,
  getSolidEffectiveHeight,
  getSolidSideCount,
} from '../solver/constraintSolver';
import { degToRad } from '../engineering/units';

export function buildObjectMesh(obj: EngineeringObject, solved: SolverResult): MeshData {
  switch (obj.params.category) {
    case 'point':
      return buildPointMesh(obj, solved);
    case 'line':
      return buildLineMesh(obj, solved);
    case 'plane':
      return buildPlaneStageMesh(obj.params.data, obj.name, solved, 3);
    case 'solid':
      return buildSolidStageMesh(obj.params.data, obj.name, solved, 3);
    case 'curve':
      return buildCurveMesh(obj.params.data, obj.name);
  }
}

function buildPointMesh(obj: EngineeringObject, solved: SolverResult): MeshData {
  const p = solved.resolvedPoint ?? vec3(0, 0, 0);
  const label = (obj.params.category === 'point' && obj.params.data.label) || obj.name || 'P';
  return {
    vertices: [p],
    faces: [],
    edges: [],
    points: [{ position: p, label, color: obj.color }],
    labels: [{ text: `${label}(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`, position: p }],
    boundingBox: computeBoundingBox([p]),
  };
}

function buildLineMesh(obj: EngineeringObject, solved: SolverResult): MeshData {
  const line = solved.resolvedLine;
  const p1 = line?.p1 ?? vec3(20, 20, 15);
  const p2 = line?.p2 ?? vec3(70, 40, 45);
  const data = obj.params.category === 'line' ? obj.params.data : null;
  const l1 = data?.labelStart || 'A';
  const l2 = data?.labelEnd || 'B';

  return {
    vertices: [p1, p2],
    faces: [],
    edges: [{ start: p1, end: p2, kind: 'solid' }],
    points: [
      { position: p1, label: l1, color: obj.color },
      { position: p2, label: l2, color: obj.color },
    ],
    labels: [
      { text: l1, position: p1 },
      { text: l2, position: p2 },
    ],
    traces: {
      ht: line?.ht ?? null,
      vt: line?.vt ?? null,
      htLine: line?.ht ? [p1, line.ht] : null,
      vtLine: line?.vt ? [p1, line.vt] : null,
    },
    boundingBox: computeBoundingBox([p1, p2]),
  };
}

/**
 * Local 2D plane vertices (Z = 0) with analytic 64-segment circles (B11)
 * and composite shapes (trapezium, rect+semicircle, circular plate with hole).
 */
export function buildLocalPlaneVertices(pl: PlaneParams): Vec3[] {
  const w = pl.width ?? 50;
  const l = pl.length ?? 30;
  const r = pl.radius ?? 25;
  const sides = Math.max(3, Math.round(pl.sides ?? 6));
  const cornerMode =
    pl.restingOn === 'hp_corner' ||
    pl.restingOn === 'vp_corner' ||
    pl.restingOn === 'hp_diameter' ||
    pl.restingOn === 'vp_diameter';

  switch (pl.shape) {
    case 'square': {
      if (cornerMode) {
        const d = w / Math.SQRT2;
        return [vec3(-d, 0, 0), vec3(0, -d, 0), vec3(d, 0, 0), vec3(0, d, 0)];
      }
      const h = w / 2;
      return [vec3(-h, -h, 0), vec3(h, -h, 0), vec3(h, h, 0), vec3(-h, h, 0)];
    }
    case 'rectangle': {
      const hw = w / 2;
      const hl = l / 2;
      if (cornerMode) {
        const ang = Math.atan2(l, w);
        const raw = [vec3(-hw, -hl, 0), vec3(hw, -hl, 0), vec3(hw, hl, 0), vec3(-hw, hl, 0)];
        const c = Math.cos(-ang), s = Math.sin(-ang);
        return raw.map((v) => vec3(v.x * c - v.y * s, v.x * s + v.y * c, 0));
      }
      return [vec3(-hw, -hl, 0), vec3(hw, -hl, 0), vec3(hw, hl, 0), vec3(-hw, hl, 0)];
    }
    case 'trapezium': {
      const hw = w / 2;
      const hl = l / 2;
      const topHalf = w * 0.3;
      return [vec3(-hl, -hw, 0), vec3(hl, -topHalf, 0), vec3(hl, topHalf, 0), vec3(-hl, hw, 0)];
    }
    case 'composite_rect_semicircle': {
      const hw = w / 2;
      const hl = l / 2;
      const verts: Vec3[] = [vec3(-hw, -hl, 0), vec3(hw, -hl, 0)];
      const segs = 32;
      for (let i = 1; i < segs; i++) {
        const a = -Math.PI / 2 + (i / segs) * Math.PI;
        verts.push(vec3(hw + hl * Math.cos(a), hl * Math.sin(a), 0));
      }
      verts.push(vec3(hw, hl, 0), vec3(-hw, hl, 0));
      return verts;
    }
    case 'rhombus': {
      const hd1 = w / 2;
      const hd2 = l / 2;
      return [vec3(-hd1, 0, 0), vec3(0, -hd2, 0), vec3(hd1, 0, 0), vec3(0, hd2, 0)];
    }
    case 'equilateral_triangle': {
      const h = (Math.sqrt(3) / 2) * w;
      if (cornerMode) {
        return [vec3((-2 * h) / 3, 0, 0), vec3(h / 3, -w / 2, 0), vec3(h / 3, w / 2, 0)];
      }
      return [vec3(-h / 3, -w / 2, 0), vec3((2 * h) / 3, 0, 0), vec3(-h / 3, w / 2, 0)];
    }
    case 'isosceles_triangle':
    case 'triangle': {
      if (cornerMode) {
        return [vec3((-2 * l) / 3, 0, 0), vec3(l / 3, -w / 2, 0), vec3(l / 3, w / 2, 0)];
      }
      return [vec3(-l / 3, -w / 2, 0), vec3((2 * l) / 3, 0, 0), vec3(-l / 3, w / 2, 0)];
    }
    case 'right_triangle': {
      return [vec3(-l / 3, -w / 2, 0), vec3((2 * l) / 3, -w / 2, 0), vec3(-l / 3, w / 2, 0)];
    }
    case 'set_square_30_60': {
      const alt = (w * Math.sqrt(3)) / 4;
      return [vec3(-alt / 2, -w / 2, 0), vec3(-alt / 2, w / 2, 0), vec3(alt / 2, w / 4, 0)];
    }
    case 'set_square_45': {
      const alt = w / 2;
      return [vec3(-alt / 2, -w / 2, 0), vec3(alt / 2, 0, 0), vec3(-alt / 2, w / 2, 0)];
    }
    case 'semicircle': {
      const verts: Vec3[] = [];
      const segs = 64;
      for (let i = 0; i <= segs; i++) {
        const a = -Math.PI / 2 + (i / segs) * Math.PI;
        verts.push(vec3(r * Math.cos(a), r * Math.sin(a), 0));
      }
      return verts;
    }
    case 'circle':
    case 'circular_plate_hole': {
      // B11: Analytic-resolution 64-segment circle!
      const verts: Vec3[] = [];
      const segs = 64;
      for (let i = 0; i < segs; i++) {
        const a = Math.PI + (i / segs) * Math.PI * 2;
        verts.push(vec3(r * Math.cos(a), r * Math.sin(a), 0));
      }
      return verts;
    }
    case 'regular_pentagon': {
      const rad = w / (2 * Math.sin(Math.PI / 5));
      const offset = cornerMode ? Math.PI : Math.PI + Math.PI / 5;
      return Array.from({ length: 5 }, (_, i) => {
        const a = offset + (i / 5) * Math.PI * 2;
        return vec3(rad * Math.cos(a), rad * Math.sin(a), 0);
      });
    }
    case 'regular_hexagon': {
      const offset = cornerMode ? Math.PI : Math.PI + Math.PI / 6;
      return Array.from({ length: 6 }, (_, i) => {
        const a = offset + (i / 6) * Math.PI * 2;
        return vec3(w * Math.cos(a), w * Math.sin(a), 0);
      });
    }
    case 'polygon': {
      if (pl.customVertices && pl.customVertices.length >= 3) return pl.customVertices;
      const offset = cornerMode ? Math.PI : Math.PI + Math.PI / sides;
      return Array.from({ length: sides }, (_, i) => {
        const a = offset + (i / sides) * Math.PI * 2;
        return vec3(r * Math.cos(a), r * Math.sin(a), 0);
      });
    }
  }
}

export function buildPlaneStageMesh(
  pl: PlaneParams,
  name: string,
  solved: SolverResult | undefined,
  stage: 1 | 2 | 3
): MeshData {
  const localRaw = buildLocalPlaneVertices(pl);
  const minLX = Math.min(...localRaw.map((v) => v.x));
  const localVerts = localRaw.map((v) => vec3(v.x - minLX, v.y, 0));

  const restingOn = pl.restingOn ?? 'hp_edge';
  const restOnVP = restingOn === 'vp_edge' || restingOn === 'vp_corner' || restingOn === 'vp_diameter';
  const isFree = restingOn === 'free';

  const theta = solved?.resolvedPlane?.theta ?? pl.theta ?? 0;
  const phi = solved?.resolvedPlane?.phi ?? pl.phi ?? 0;
  const apparentS3 = solved?.resolvedPlane?.apparentStage3Angle ?? pl.stage3Angle ?? 0;
  const isEdgeRest = restingOn === 'hp_edge' || restingOn === 'vp_edge';

  const s3Rot =
    stage === 3 && Math.abs(apparentS3) > 0.05
      ? isEdgeRest && pl.stage3Ref !== 'diagonal_or_median'
        ? 90 - apparentS3
        : apparentS3
      : 0;

  const baseX = pl.centerX ?? 35;
  const baseY = pl.centerY ?? 45;
  const baseZ = pl.centerZ ?? 35;

  let transformed: Vec3[];

  if (isFree) {
    const rotMat = mat4EulerXYZ(pl.rotX ?? 0, (pl.rotY ?? 0) - theta, (pl.rotZ ?? 0) + phi + apparentS3);
    const mat = mat4Multiply(mat4Translation(baseX, baseY, baseZ), rotMat);
    transformed = localVerts.map((v) => transformPoint(mat, v));
  } else if (!restOnVP) {
    let mat = mat4Identity();
    if (stage >= 2 && Math.abs(theta) > 0.05) {
      mat = mat4Multiply(mat4RotationY(-theta), mat);
    }
    if (stage === 3 && Math.abs(s3Rot) > 0.05) {
      mat = mat4Multiply(mat4RotationZ(s3Rot), mat);
    }
    const pts = localVerts.map((v) => transformPoint(mat, v));
    const minX = Math.min(...pts.map((v) => v.x));
    const minY = Math.min(...pts.map((v) => v.y));
    const minZ = Math.min(...pts.map((v) => v.z));
    const tx = baseX - minX;
    const ty = Math.max(15, baseY - 25) - minY;
    const tz = -minZ;
    transformed = pts.map((v) => vec3(v.x + tx, v.y + ty, v.z + tz));
  } else {
    const vpLocal = localVerts.map((v) => vec3(v.x, 0, v.y));
    let mat = mat4Identity();
    if (stage >= 2 && Math.abs(phi) > 0.05) {
      mat = mat4Multiply(mat4RotationZ(phi), mat);
    }
    if (stage === 3 && Math.abs(s3Rot) > 0.05) {
      mat = mat4Multiply(mat4RotationY(-s3Rot), mat);
    }
    const pts = vpLocal.map((v) => transformPoint(mat, v));
    const minX = Math.min(...pts.map((v) => v.x));
    const minY = Math.min(...pts.map((v) => v.y));
    const minZ = Math.min(...pts.map((v) => v.z));
    const tx = baseX - minX;
    const ty = -minY;
    const tz = Math.max(15, baseZ - 20) - minZ;
    transformed = pts.map((v) => vec3(v.x + tx, v.y + ty, v.z + tz));
  }

  const edges: Edge3D[] = [];
  for (let i = 0; i < transformed.length; i++) {
    edges.push({
      start: transformed[i],
      end: transformed[(i + 1) % transformed.length],
      kind: 'solid',
      faceIndices: [0],
    });
  }

  if (pl.shape === 'circular_plate_hole') {
    const r = pl.radius ?? 25;
    const holeR = pl.holeRadius ?? r * 0.4;
    const ratio = holeR / Math.max(1e-3, r);
    const cx = transformed.reduce((a, v) => a + v.x, 0) / transformed.length;
    const cy = transformed.reduce((a, v) => a + v.y, 0) / transformed.length;
    const cz = transformed.reduce((a, v) => a + v.z, 0) / transformed.length;
    const holeVerts = transformed.map((v) =>
      vec3(cx + (v.x - cx) * ratio, cy + (v.y - cy) * ratio, cz + (v.z - cz) * ratio)
    );
    for (let i = 0; i < holeVerts.length; i++) {
      edges.push({
        start: holeVerts[i],
        end: holeVerts[(i + 1) % holeVerts.length],
        kind: 'solid',
        faceIndices: [0],
      });
    }
  }

  const faces: Face3D[] = [];
  if (transformed.length >= 3) {
    const n = normalize(cross(sub(transformed[1], transformed[0]), sub(transformed[2], transformed[0])));
    for (let i = 1; i < transformed.length - 1; i++) {
      faces.push({ indices: [0, i, i + 1], normal: n });
    }
  }

  const alphaLabels = 'ABCDEFGHIJKL';
  const centroid = vec3(
    transformed.reduce((a, v) => a + v.x, 0) / transformed.length,
    transformed.reduce((a, v) => a + v.y, 0) / transformed.length,
    transformed.reduce((a, v) => a + v.z, 0) / transformed.length
  );

  // For high-res 64-gon circles, mark 8 cardinal/45° reference points for clean labels & projectors
  const displayPoints =
    transformed.length <= 12
      ? transformed.map((v, idx) => ({ position: v, label: alphaLabels[idx] || `${idx + 1}` }))
      : Array.from({ length: 8 }, (_, k) => {
          const idx = Math.floor((k / 8) * transformed.length);
          return { position: transformed[idx], label: `${k + 1}` };
        });

  return {
    vertices: transformed,
    faces,
    edges,
    points: displayPoints,
    labels: [{ text: name, position: centroid }],
    boundingBox: computeBoundingBox(transformed),
  };
}

function getSolidBasePhase(s: SolidParams, n: number): number {
  const orient = s.baseOrientation ?? 'auto';
  const rest = s.restingOn ?? 'hp_base';

  if (orient === 'custom' && typeof s.baseEdgeAngle === 'number') {
    return degToRad(s.baseEdgeAngle);
  }
  if (orient === 'edge_perp_vp') return Math.PI / n;
  if (orient === 'edge_parallel_vp') return Math.PI / 2 + Math.PI / n;
  if (orient === 'equally_inclined') return 0;
  if (orient === 'corner_right') return 0;

  if (
    rest === 'hp_base_edge' ||
    rest === 'vp_base_edge' ||
    rest === 'hp_slant_face' ||
    rest === 'vp_slant_face' ||
    rest === 'hp_rect_face' ||
    rest === 'axis_parallel_both'
  ) {
    return Math.PI / n;
  }
  if (
    rest === 'hp_base_corner' ||
    rest === 'vp_base_corner' ||
    rest === 'hp_slant_edge' ||
    rest === 'vp_slant_edge' ||
    rest === 'hp_longer_edge' ||
    rest === 'hp_freely_suspended' ||
    rest === 'cube_solid_diagonal_vertical'
  ) {
    return 0;
  }
  if (n === 4) return Math.PI / 4;
  return Math.PI / n;
}

/**
 * Exact 3D Solid Builder (v4) with 64-segment analytic circles for Cylinder/Cone/Frustum (B10).
 */
export function buildSolidStageMesh(
  s: SolidParams,
  name: string,
  solved: SolverResult | undefined,
  stage: 1 | 2 | 3
): MeshData {
  const w = s.width ?? 35;
  const l = s.length ?? w;
  const h = getSolidEffectiveHeight(s);
  const r = s.radius ?? 25;
  const rIn = Math.min(r * 0.88, Math.max(2, s.innerRadius ?? r * 0.55));
  const rTop = s.topRadius ?? Math.min(w, r) * 0.45;
  const sides = getSolidSideCount(s);
  const baseR = getSolidBaseRadius(s);
  const phase = getSolidBasePhase(s, sides) + (s.baseOrientation === 'custom' ? 0 : degToRad(s.baseEdgeAngle ?? 0));

  let localVerts: Vec3[] = [];
  let rawFaces: number[][] = [];
  let edgeSpecs: Array<{ a: number; b: number; smooth?: boolean }> = [];
  let keyPointIndices: Array<{ idx: number; label: string }> = [];

  const makeRing = (rad: number, z: number, count: number, ph: number): Vec3[] =>
    Array.from({ length: count }, (_, i) => {
      const a = ph + (i / count) * Math.PI * 2;
      return vec3(rad * Math.cos(a), rad * Math.sin(a), z);
    });

  const addPrism = (baseRing: Vec3[], topRing: Vec3[], smoothLateral = false) => {
    const n = baseRing.length;
    const baseOffset = localVerts.length;
    localVerts.push(...baseRing, ...topRing);
    rawFaces.push(Array.from({ length: n }, (_, i) => baseOffset + n - 1 - i));
    rawFaces.push(Array.from({ length: n }, (_, i) => baseOffset + n + i));
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      rawFaces.push([baseOffset + i, baseOffset + next, baseOffset + n + next, baseOffset + n + i]);
      edgeSpecs.push({ a: baseOffset + i, b: baseOffset + next, smooth: false });
      edgeSpecs.push({ a: baseOffset + n + i, b: baseOffset + n + next, smooth: false });
      edgeSpecs.push({ a: baseOffset + i, b: baseOffset + n + i, smooth: smoothLateral });
    }
    if (n <= 6 && baseOffset === 0) {
      const letters = 'ABCDEF';
      for (let i = 0; i < n; i++) {
        keyPointIndices.push({ idx: i, label: `${i + 1}` });
        keyPointIndices.push({ idx: n + i, label: letters[i] });
      }
    }
  };

  const addPyramid = (baseRing: Vec3[], apex: Vec3, smoothLateral = false) => {
    const n = baseRing.length;
    const baseOffset = localVerts.length;
    localVerts.push(...baseRing, apex);
    const apexIdx = baseOffset + n;
    rawFaces.push(Array.from({ length: n }, (_, i) => baseOffset + n - 1 - i));
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      rawFaces.push([baseOffset + i, baseOffset + next, apexIdx]);
      edgeSpecs.push({ a: baseOffset + i, b: baseOffset + next, smooth: false });
      edgeSpecs.push({ a: baseOffset + i, b: apexIdx, smooth: smoothLateral });
    }
    if (n <= 6) {
      const letters = 'ABCDEF';
      for (let i = 0; i < n; i++) {
        keyPointIndices.push({ idx: baseOffset + i, label: letters[i] });
      }
    }
    keyPointIndices.push({ idx: apexIdx, label: 'O' });
  };

  const addHollowPrism = (outerR: number, innerR: number, n: number, ph: number, smoothLat: boolean) => {
    const bOut = makeRing(outerR, 0, n, ph);
    const tOut = makeRing(outerR, h, n, ph);
    const bIn = makeRing(innerR, 0, n, ph);
    const tIn = makeRing(innerR, h, n, ph);
    localVerts.push(...bOut, ...tOut, ...bIn, ...tIn);
    for (let i = 0; i < n; i++) {
      const nxt = (i + 1) % n;
      rawFaces.push([i, nxt, n + nxt, n + i]);
      rawFaces.push([2 * n + nxt, 2 * n + i, 3 * n + i, 3 * n + nxt]);
      rawFaces.push([nxt, i, 2 * n + i, 2 * n + nxt]);
      rawFaces.push([n + i, n + nxt, 3 * n + nxt, 3 * n + i]);

      edgeSpecs.push({ a: i, b: nxt, smooth: false });
      edgeSpecs.push({ a: n + i, b: n + nxt, smooth: false });
      edgeSpecs.push({ a: i, b: n + i, smooth: smoothLat });
      edgeSpecs.push({ a: 2 * n + i, b: 2 * n + nxt, smooth: false });
      edgeSpecs.push({ a: 3 * n + i, b: 3 * n + nxt, smooth: false });
      edgeSpecs.push({ a: 2 * n + i, b: 3 * n + i, smooth: smoothLat });
    }
  };

  switch (s.solidType) {
    case 'tetrahedron':
      addPyramid(makeRing(baseR, 0, 3, phase), vec3(0, 0, h));
      break;
    case 'cube': {
      const rad = w / Math.SQRT2;
      addPrism(makeRing(rad, 0, 4, phase), makeRing(rad, w, 4, phase));
      break;
    }
    case 'cuboid': {
      const hw = w / 2, hl = l / 2;
      addPrism(
        [vec3(-hw, -hl, 0), vec3(hw, -hl, 0), vec3(hw, hl, 0), vec3(-hw, hl, 0)],
        [vec3(-hw, -hl, h), vec3(hw, -hl, h), vec3(hw, hl, h), vec3(-hw, hl, h)]
      );
      break;
    }
    case 'octahedron': {
      const midR = w / Math.SQRT2;
      const mid = makeRing(midR, h / 2, 4, phase);
      const botApex = vec3(0, 0, 0);
      const topApex = vec3(0, 0, h);
      localVerts = [...mid, botApex, topApex];
      const bIdx = 4, tIdx = 5;
      for (let i = 0; i < 4; i++) {
        const nxt = (i + 1) % 4;
        rawFaces.push([i, nxt, tIdx]);
        rawFaces.push([nxt, i, bIdx]);
        edgeSpecs.push({ a: i, b: nxt }, { a: i, b: tIdx }, { a: i, b: bIdx });
      }
      keyPointIndices.push({ idx: bIdx, label: 'P' }, { idx: tIdx, label: 'O' });
      break;
    }
    case 'triangular_prism':
    case 'square_prism':
    case 'pentagonal_prism':
    case 'hexagonal_prism':
    case 'prism':
      addPrism(makeRing(baseR, 0, sides, phase), makeRing(baseR, h, sides, phase));
      break;
    case 'hollow_prism':
      addHollowPrism(baseR, Math.min(baseR * 0.85, rIn), sides, phase, false);
      break;
    case 'triangular_pyramid':
    case 'square_pyramid':
    case 'pentagonal_pyramid':
    case 'hexagonal_pyramid':
    case 'pyramid':
      addPyramid(makeRing(baseR, 0, sides, phase), vec3(0, 0, h));
      break;
    case 'cylinder':
      // B10: 64-segment analytic circle base!
      addPrism(makeRing(r, 0, 64, 0), makeRing(r, h, 64, 0), true);
      break;
    case 'hollow_cylinder':
      addHollowPrism(r, rIn, 64, 0, true);
      break;
    case 'cone':
      addPyramid(makeRing(r, 0, 64, 0), vec3(0, 0, h), true);
      break;
    case 'frustum_cone':
      addPrism(makeRing(r, 0, 64, 0), makeRing(rTop, h, 64, 0), true);
      break;
    case 'frustum_pyramid':
      addPrism(makeRing(baseR, 0, sides, phase), makeRing(rTop, h, sides, phase), false);
      break;
    case 'sphere':
    case 'hemisphere': {
      const stacks = s.solidType === 'sphere' ? 16 : 8;
      const slices = 32;
      const maxPhi = s.solidType === 'sphere' ? Math.PI : Math.PI / 2;
      const zCenter = s.solidType === 'sphere' ? r : 0;
      for (let i = 0; i <= stacks; i++) {
        const phiA = (i / stacks) * maxPhi;
        for (let j = 0; j < slices; j++) {
          const thetaA = (j / slices) * Math.PI * 2;
          localVerts.push(
            vec3(
              r * Math.sin(phiA) * Math.cos(thetaA),
              r * Math.sin(phiA) * Math.sin(thetaA),
              zCenter + r * Math.cos(phiA)
            )
          );
        }
      }
      for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
          const next = (j + 1) % slices;
          const a = i * slices + j, b = i * slices + next, c = (i + 1) * slices + next, d = (i + 1) * slices + j;
          rawFaces.push([a, d, c, b]);
          edgeSpecs.push({ a, b, smooth: true });
          edgeSpecs.push({ a, b: d, smooth: true });
        }
      }
      if (s.solidType === 'hemisphere') {
        const ringStart = stacks * slices;
        for (let j = 0; j < slices; j++) {
          edgeSpecs.push({ a: ringStart + j, b: ringStart + ((j + 1) % slices), smooth: false });
        }
      }
      break;
    }
  }

  const localAxisStart = vec3(0, 0, 0);
  const localAxisEnd = vec3(0, 0, h);

  const restingOn = s.restingOn ?? 'hp_base';
  const restOnVP = restingOn.startsWith('vp_');
  const stage2Tilt = solved?.resolvedSolid?.stage2TiltDeg ?? 0;
  const stage3Rot = solved?.resolvedSolid?.stage3RotationDeg ?? 0;

  let mat = mat4Identity();
  if (!restOnVP) {
    if (stage >= 2 && Math.abs(stage2Tilt) > 0.05) {
      mat = mat4Multiply(mat4RotationY(stage2Tilt), mat);
    }
    if (stage === 3 && Math.abs(stage3Rot) > 0.05) {
      mat = mat4Multiply(mat4RotationZ(stage3Rot), mat);
    }
  } else {
    mat = mat4RotationX(-90);
    if (stage >= 2 && Math.abs(stage2Tilt) > 0.05) {
      mat = mat4Multiply(mat4RotationZ(-stage2Tilt), mat);
    }
    if (stage === 3 && Math.abs(stage3Rot) > 0.05) {
      mat = mat4Multiply(mat4RotationY(stage3Rot), mat);
    }
  }

  if (stage === 3 && ((s.rotX ?? 0) !== 0 || (s.rotY ?? 0) !== 0 || (s.rotZ ?? 0) !== 0)) {
    mat = mat4Multiply(mat4EulerXYZ(s.rotX ?? 0, s.rotY ?? 0, s.rotZ ?? 0), mat);
  }

  const rotatedVerts = localVerts.map((v) => transformPoint(mat, v));
  const rotAxisStart = transformPoint(mat, localAxisStart);
  const rotAxisEnd = transformPoint(mat, localAxisEnd);

  const bb = computeBoundingBox(rotatedVerts);
  const targetCX = s.centerX ?? 60;
  const targetCY = s.centerY ?? 45;
  const targetCZ = s.centerZ ?? 35;

  const midX = (bb.min.x + bb.max.x) / 2;
  const midY = (bb.min.y + bb.max.y) / 2;
  const midZ = (bb.min.z + bb.max.z) / 2;

  const shiftX = targetCX - midX;
  const shiftY = restOnVP ? -bb.min.y : Math.max(targetCY - midY, 15 - bb.min.y);
  const shiftZ = restOnVP ? Math.max(targetCZ - midZ, 15 - bb.min.z) : -bb.min.z;

  const shift = (v: Vec3) => vec3(v.x + shiftX, v.y + shiftY, v.z + shiftZ);
  const vertices = rotatedVerts.map(shift);
  const axisStart = shift(rotAxisStart);
  const axisEnd = shift(rotAxisEnd);

  const faces: Face3D[] = [];
  const edgeToFaces = new Map<string, { a: number; b: number; faceIndices: number[] }>();

  for (const poly of rawFaces) {
    if (poly.length < 3) continue;
    const v0 = vertices[poly[0]], v1 = vertices[poly[1]], v2 = vertices[poly[2]];
    const n = normalize(cross(sub(v1, v0), sub(v2, v0)));
    for (let i = 1; i < poly.length - 1; i++) {
      const fIdx = faces.length;
      faces.push({ indices: [poly[0], poly[i], poly[i + 1]], normal: n });
      const tri = [poly[0], poly[i], poly[i + 1]];
      for (let k = 0; k < 3; k++) {
        const a = tri[k], b = tri[(k + 1) % 3];
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        const existing = edgeToFaces.get(key);
        if (existing) existing.faceIndices.push(fIdx);
        else edgeToFaces.set(key, { a, b, faceIndices: [fIdx] });
      }
    }
  }

  const edges: Edge3D[] = edgeSpecs.map(({ a, b, smooth }) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    return {
      start: vertices[a],
      end: vertices[b],
      kind: 'solid',
      faceIndices: edgeToFaces.get(key)?.faceIndices ?? [],
      smooth: Boolean(smooth),
    };
  });

  edges.push({ start: axisStart, end: axisEnd, kind: 'axis' });

  let sectionPlane: SectionPlaneInfo | null = null;
  if (s.sectionEnabled) {
    const secType = s.sectionPlaneType ?? 'aip';
    const secAng = s.sectionAngle ?? 45;
    const secH = s.sectionHeight ?? h * 0.5;
    const secOff = s.sectionOffset ?? 0;
    const rad = degToRad(secAng);
    const finalBB = computeBoundingBox(vertices);
    const cx = (finalBB.min.x + finalBB.max.x) / 2;
    const cy = (finalBB.min.y + finalBB.max.y) / 2;
    const cz = finalBB.min.z + secH;

    if (secType === 'horizontal') {
      sectionPlane = { point: vec3(cx, cy, cz), normal: vec3(0, 0, 1), type: secType, angle: 0 };
    } else if (secType === 'frontal') {
      sectionPlane = { point: vec3(cx, cy + secOff, cz), normal: vec3(0, 1, 0), type: secType, angle: 0 };
    } else if (secType === 'profile') {
      sectionPlane = { point: vec3(cx + secOff, cy, cz), normal: vec3(1, 0, 0), type: secType, angle: 90 };
    } else if (secType === 'avp') {
      sectionPlane = {
        point: vec3(cx, cy + secOff, cz),
        normal: normalize(vec3(-Math.sin(rad), Math.cos(rad), 0)),
        type: secType,
        angle: secAng,
      };
    } else {
      sectionPlane = {
        point: vec3(cx, cy, cz),
        normal: normalize(vec3(-Math.sin(rad), 0, Math.cos(rad))),
        type: 'aip',
        angle: secAng,
      };
    }
  }

  const finalBB = computeBoundingBox(vertices);
  const center3D = vec3(
    (finalBB.min.x + finalBB.max.x) / 2,
    (finalBB.min.y + finalBB.max.y) / 2,
    (finalBB.min.z + finalBB.max.z) / 2
  );

  return {
    vertices,
    faces,
    edges,
    points: keyPointIndices.map((kp) => ({ position: vertices[kp.idx], label: kp.label })),
    labels: [{ text: name, position: center3D }],
    sectionPlane,
    boundingBox: finalBB,
  };
}

function buildCurveMesh(c: CurveParams, name: string): MeshData {
  const r = c.radius ?? 30;
  const maj = c.majorRadius ?? 45;
  const min = c.minorRadius ?? 30;
  const segs = 64;
  const localVerts: Vec3[] = [];

  switch (c.curveType) {
    case 'circle':
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        localVerts.push(vec3(r * Math.cos(a), r * Math.sin(a), 0));
      }
      break;
    case 'arc': {
      const a0 = ((c.startAngle ?? 0) * Math.PI) / 180;
      const a1 = ((c.endAngle ?? 180) * Math.PI) / 180;
      for (let i = 0; i <= segs; i++) {
        const a = a0 + (i / segs) * (a1 - a0);
        localVerts.push(vec3(r * Math.cos(a), r * Math.sin(a), 0));
      }
      break;
    }
    case 'ellipse':
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        localVerts.push(vec3(maj * Math.cos(a), min * Math.sin(a), 0));
      }
      break;
    case 'helix': {
      const pitch = c.pitch ?? 20;
      const turns = c.turns ?? 2;
      const steps = Math.round(turns * 48);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = t * turns * Math.PI * 2;
        localVerts.push(vec3(r * Math.cos(a), r * Math.sin(a), t * turns * pitch));
      }
      break;
    }
    case 'polygon': {
      const sides = Math.max(3, Math.round(c.sides ?? 5));
      for (let i = 0; i <= sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        localVerts.push(vec3(r * Math.cos(a), r * Math.sin(a), 0));
      }
      break;
    }
    case 'polyline':
    case 'spline': {
      const pts =
        c.controlPoints && c.controlPoints.length >= 2
          ? c.controlPoints
          : [vec3(-30, 0, 0), vec3(-10, 25, 15), vec3(15, -15, 25), vec3(35, 10, 5)];
      localVerts.push(...pts);
      break;
    }
  }

  const center = vec3(c.centerX ?? 50, c.centerY ?? 40, c.centerZ ?? 20);
  const rotMat = mat4EulerXYZ(c.rotX ?? 0, c.rotY ?? 0, c.rotZ ?? 0);
  const mat = mat4Multiply(mat4Translation(center.x, center.y, center.z), rotMat);
  const vertices = localVerts.map((v) => transformPoint(mat, v));

  const edges: Edge3D[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    edges.push({ start: vertices[i], end: vertices[i + 1], kind: 'solid' });
  }

  return {
    vertices,
    faces: [],
    edges,
    points: [],
    labels: [{ text: name, position: center }],
    boundingBox: computeBoundingBox(vertices),
  };
}

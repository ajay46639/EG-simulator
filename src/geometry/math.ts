import { Vec3 } from '../types/engineering';

export const EPS = 1e-6;

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len < EPS) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function nearlyEqual(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

export function vecNearlyEqual(a: Vec3, b: Vec3, eps = EPS): boolean {
  return nearlyEqual(a.x, b.x, eps) && nearlyEqual(a.y, b.y, eps) && nearlyEqual(a.z, b.z, eps);
}

export function angleBetweenDeg(a: Vec3, b: Vec3): number {
  const la = length(a);
  const lb = length(b);
  if (la < EPS || lb < EPS) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot(a, b) / (la * lb)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/** 4x4 Row-Major Transformation Matrix */
export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

export function mat4Identity(): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array(16).fill(0) as Mat4;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[r * 4 + c] =
        a[r * 4 + 0] * b[0 * 4 + c] +
        a[r * 4 + 1] * b[1 * 4 + c] +
        a[r * 4 + 2] * b[2 * 4 + c] +
        a[r * 4 + 3] * b[3 * 4 + c];
    }
  }
  return out;
}

export function mat4Translation(tx: number, ty: number, tz: number): Mat4 {
  return [
    1, 0, 0, tx,
    0, 1, 0, ty,
    0, 0, 1, tz,
    0, 0, 0, 1,
  ];
}

export function mat4RotationX(deg: number): Mat4 {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1,
  ];
}

export function mat4RotationY(deg: number): Mat4 {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1,
  ];
}

export function mat4RotationZ(deg: number): Mat4 {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    c, -s, 0, 0,
    s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export function mat4EulerXYZ(rxDeg: number, ryDeg: number, rzDeg: number): Mat4 {
  return mat4Multiply(mat4RotationZ(rzDeg), mat4Multiply(mat4RotationY(ryDeg), mat4RotationX(rxDeg)));
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return {
    x: m[0] * p.x + m[1] * p.y + m[2] * p.z + m[3],
    y: m[4] * p.x + m[5] * p.y + m[6] * p.z + m[7],
    z: m[8] * p.x + m[9] * p.y + m[10] * p.z + m[11],
  };
}

export function transformDirection(m: Mat4, d: Vec3): Vec3 {
  return {
    x: m[0] * d.x + m[1] * d.y + m[2] * d.z,
    y: m[4] * d.x + m[5] * d.y + m[6] * d.z,
    z: m[8] * d.x + m[9] * d.y + m[10] * d.z,
  };
}

export interface PlaneEq {
  normal: Vec3;
  d: number; // dot(normal, p) + d = 0
}

export function planeFromPointNormal(point: Vec3, normal: Vec3): PlaneEq {
  const n = normalize(normal);
  return { normal: n, d: -dot(n, point) };
}

export function pointToPlaneDistance(point: Vec3, plane: PlaneEq): number {
  return dot(plane.normal, point) + plane.d;
}

export function intersectLinePlane(
  p1: Vec3,
  p2: Vec3,
  plane: PlaneEq
): { hit: boolean; point: Vec3 | null; t: number | null } {
  const dir = sub(p2, p1);
  const denom = dot(plane.normal, dir);
  if (Math.abs(denom) < EPS) {
    return { hit: false, point: null, t: null };
  }
  const t = -(dot(plane.normal, p1) + plane.d) / denom;
  return { hit: true, point: add(p1, scale(dir, t)), t };
}

export function projectPointOntoHP(p: Vec3): Vec3 {
  return { x: p.x, y: p.y, z: 0 };
}

export function projectPointOntoVP(p: Vec3): Vec3 {
  return { x: p.x, y: 0, z: p.z };
}

export function projectPointOntoPP(p: Vec3): Vec3 {
  return { x: 0, y: p.y, z: p.z };
}

export function computeBoundingBox(vertices: Vec3[]): { min: Vec3; max: Vec3 } {
  if (vertices.length === 0) {
    return { min: vec3(0, 0, 0), max: vec3(0, 0, 0) };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  }
  return { min: vec3(minX, minY, minZ), max: vec3(maxX, maxY, maxZ) };
}

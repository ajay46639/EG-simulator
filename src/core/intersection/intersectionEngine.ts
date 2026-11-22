import { Vec2, Vec3 } from '../../types/engineering';

export type IntersectionPairType =
  | 'cylinder_cylinder'
  | 'prism_prism'
  | 'cone_cylinder'
  | 'sphere_cylinder';

export interface IntersectionInput {
  pairType: IntersectionPairType;
  mainRadius: number; // Main vertical solid radius (or half-diagonal for square prism)
  mainHeight: number;
  penRadius: number; // Horizontal penetrating solid radius
  penLength: number;
  axisOffset: number; // Offset e between axes along Y (0 = intersecting axes)
  penHeight: number; // Height of horizontal penetrating axis above HP
}

export interface IntersectionOutput {
  title: string;
  summary: string;
  curves3D: Vec3[][];
  fvCurves: Vec2[][];
  tvCurves: Vec2[][];
  svCurves: Vec2[][];
  mainOutlineFV: Array<[Vec2, Vec2]>;
  penOutlineFV: Array<[Vec2, Vec2]>;
  boundsFV: { minU: number; maxU: number; minV: number; maxV: number };
}

/**
 * Analytic Intersection of Surfaces Engine (N.D. Bhatt Ch. 16 — W16-1..34):
 * Computes exact 3D curves of interpenetration (both entry & exit loops) for:
 * - Cylinder ∩ Cylinder (W16-8..11)
 * - Square Prism ∩ Square Prism (W16-1..3)
 * - Cone ∩ Horizontal Cylinder (W16-22..26)
 * - Sphere ∩ Vertical Cylinder (E16.19)
 */
export function computeSolidIntersection(inp: IntersectionInput): IntersectionOutput {
  const R = Math.max(10, inp.mainRadius);
  const H = Math.max(30, inp.mainHeight);
  const r = Math.max(5, Math.min(R * 0.98, inp.penRadius));
  const L = Math.max(R * 2.4, inp.penLength);
  const e = Math.max(-(R - r) * 0.9, Math.min((R - r) * 0.9, inp.axisOffset));
  const z0 = Math.max(r + 2, Math.min(H - r - 2, inp.penHeight));

  const leftLoop: Vec3[] = [];
  const rightLoop: Vec3[] = [];
  const steps = 64;

  if (inp.pairType === 'cylinder_cylinder') {
    // Vertical cylinder x² + y² = R² intersected by horizontal cylinder (y - e)² + (z - z0)² = r²
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const y = e + r * Math.cos(ang);
      const z = z0 + r * Math.sin(ang);
      const xSq = R * R - y * y;
      if (xSq >= 0) {
        const x = Math.sqrt(xSq);
        rightLoop.push({ x, y, z });
        leftLoop.push({ x: -x, y, z });
      }
    }
  } else if (inp.pairType === 'prism_prism') {
    // Vertical square prism (faces equally inclined 45° to VP: |x| + |y| = R)
    // intersected by horizontal square prism (faces 45° to HP: |y - e| + |z - z0| = r)
    const corners: Array<[number, number]> = [
      [e + r, z0],
      [e, z0 + r],
      [e - r, z0],
      [e, z0 - r],
      [e + r, z0],
    ];
    for (let seg = 0; seg < 4; seg++) {
      const [yA, zA] = corners[seg];
      const [yB, zB] = corners[seg + 1];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const y = yA + t * (yB - yA);
        const z = zA + t * (zB - zA);
        const x = Math.max(0, R - Math.abs(y));
        rightLoop.push({ x, y, z });
        leftLoop.push({ x: -x, y, z });
      }
    }
  } else if (inp.pairType === 'cone_cylinder') {
    // Vertical cone: radius at height z is R(z) = R * (1 - z / H)
    // Intersected by horizontal cylinder (y - e)² + (z - z0)² = r²
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const y = e + r * Math.cos(ang);
      const z = z0 + r * Math.sin(ang);
      const Rz = R * Math.max(0, 1 - z / H);
      const xSq = Rz * Rz - y * y;
      if (xSq >= 0) {
        const x = Math.sqrt(xSq);
        rightLoop.push({ x, y, z });
        leftLoop.push({ x: -x, y, z });
      }
    }
  } else {
    // Sphere (centered at z = R, radius R) ∩ Horizontal Cylinder (y - e)² + (z - z0)² = r²
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const y = e + r * Math.cos(ang);
      const z = z0 + r * Math.sin(ang);
      const xSq = R * R - y * y - (z - R) * (z - R);
      if (xSq >= 0) {
        const x = Math.sqrt(xSq);
        rightLoop.push({ x, y, z });
        leftLoop.push({ x: -x, y, z });
      }
    }
  }

  const curves3D = [leftLoop, rightLoop].filter((c) => c.length >= 2);
  const fvCurves = curves3D.map((c) => c.map((p) => ({ u: p.x, v: p.z })));
  const tvCurves = curves3D.map((c) => c.map((p) => ({ u: p.x, v: -p.y })));
  const svCurves = curves3D.map((c) => c.map((p) => ({ u: p.y, v: p.z })));

  // Outlines in Front View
  const mainOutlineFV: Array<[Vec2, Vec2]> =
    inp.pairType === 'cone_cylinder'
      ? [
          [{ u: -R, v: 0 }, { u: R, v: 0 }],
          [{ u: -R, v: 0 }, { u: 0, v: H }],
          [{ u: R, v: 0 }, { u: 0, v: H }],
        ]
      : inp.pairType === 'sphere_cylinder'
      ? Array.from({ length: 48 }, (_, i): [Vec2, Vec2] => {
          const a1 = (i / 48) * Math.PI * 2;
          const a2 = ((i + 1) / 48) * Math.PI * 2;
          return [
            { u: R * Math.cos(a1), v: R + R * Math.sin(a1) },
            { u: R * Math.cos(a2), v: R + R * Math.sin(a2) },
          ];
        })
      : [
          [{ u: -R, v: 0 }, { u: R, v: 0 }],
          [{ u: -R, v: H }, { u: R, v: H }],
          [{ u: -R, v: 0 }, { u: -R, v: H }],
          [{ u: R, v: 0 }, { u: R, v: H }],
        ];

  const halfL = L / 2;
  const penOutlineFV: Array<[Vec2, Vec2]> = [
    [{ u: -halfL, v: z0 - r }, { u: halfL, v: z0 - r }],
    [{ u: -halfL, v: z0 + r }, { u: halfL, v: z0 + r }],
    [{ u: -halfL, v: z0 - r }, { u: -halfL, v: z0 + r }],
    [{ u: halfL, v: z0 - r }, { u: halfL, v: z0 + r }],
  ];

  return {
    title: `Intersection: ${inp.pairType.replace(/_/g, ' ∩ ').toUpperCase()}`,
    summary: `Main R=${R}mm, H=${H}mm | Penetrator r=${r}mm, L=${L}mm | Axis Offset e=${e}mm | Height=${z0}mm`,
    curves3D,
    fvCurves,
    tvCurves,
    svCurves,
    mainOutlineFV,
    penOutlineFV,
    boundsFV: { minU: -halfL - 15, maxU: halfL + 15, minV: -10, maxV: Math.max(H, 2 * R) + 15 },
  };
}

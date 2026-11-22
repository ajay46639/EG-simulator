import { describe, expect, it } from 'vitest';
import { mat4RotationZ, nearlyEqual, transformPoint, vec3 } from '../src/geometry/math';
import { detectQuadrant } from '../src/engineering/units';
import { solveLine, solvePlane, solvePoint, solveSolid } from '../src/solver/constraintSolver';
import { buildObjectMesh, buildSolidStageMesh } from '../src/geometry/builders';
import { projectMeshToView, projectPoint2D } from '../src/projections/projector';
import { buildMultiStageSheet } from '../src/projections/multiStageSheet';
import {
  buildArchimedeanSpiral,
  buildConicByEccentricity,
  buildCycloid,
  buildInvoluteCircle,
  buildParabolaRectangle,
  buildTrochoidCircle,
  computeScale,
} from '../src/engineering/curvesAndScales';
import { EngineeringObject, ProjectionSettings } from '../src/types/engineering';

const DEFAULT_SETTINGS: ProjectionSettings = {
  convention: 'first-angle',
  scaleRatio: 1,
  scaleLabel: '1:1',
  showHP: true,
  showVP: true,
  showXY: true,
  showProjectors: true,
  showHiddenLines: true,
  showDimensions: true,
  showLabels: true,
  showTraces: true,
  helpers: {
    masterHelpers: true,
    projectors: true,
    locusLines: true,
    constructionArcs: true,
    trueLengthLines: true,
    traces: true,
    centerAxisLines: true,
    hiddenEdges: true,
    dimensions: true,
    labels: true,
    stageGuides: true,
  },
  hpOpacity: 0.22,
  vpOpacity: 0.22,
  hpColor: '#0ea5e9',
  vpColor: '#8b5cf6',
  cameraMode: 'perspective',
  sectionEnabled: false,
  sectionAxis: 'z',
  sectionOffset: 30,
  sectionAngle: 45,
  auxiliaryEnabled: false,
  auxiliaryAngle: 45,
};

describe('Coordinate System, Quadrants & Points (N.D. Bhatt Ch. 9)', () => {
  it('identifies all four quadrants and reference planes', () => {
    expect(detectQuadrant(vec3(10, 20, 30))).toBe('I');
    expect(detectQuadrant(vec3(10, -20, 30))).toBe('II');
    expect(detectQuadrant(vec3(10, -20, -30))).toBe('III');
    expect(detectQuadrant(vec3(10, 20, -30))).toBe('IV');
    expect(detectQuadrant(vec3(10, 20, 0))).toBe('HP');
    expect(detectQuadrant(vec3(10, 0, 30))).toBe('VP');
    expect(detectQuadrant(vec3(10, 0, 0))).toBe('XY');
  });

  it('solves Point 20mm below HP in Q3 with distXY=40mm', () => {
    const res = solvePoint({ x: 30, distHP: 20, distXY: 40, quadrant: 'III' });
    expect(res.status).toBe('fully_determined');
    expect(nearlyEqual(res.resolvedPoint!.z, -20, 1e-3)).toBe(true);
    expect(nearlyEqual(res.resolvedPoint!.y, -Math.sqrt(1200), 1e-2)).toBe(true);
  });

  it('applies rotation matrix accurately', () => {
    const rot = transformPoint(mat4RotationZ(90), vec3(10, 0, 0));
    expect(nearlyEqual(rot.x, 0, 1e-5)).toBe(true);
    expect(nearlyEqual(rot.y, 10, 1e-5)).toBe(true);
  });
});

describe('Straight Lines — All N.D. Bhatt Ch. 10 Cases', () => {
  it('solves Midpoint in VP 20mm above HP, TL=100, θ=30°, φ=45°', () => {
    const res = solveLine({
      anchorType: 'midpoint',
      trueLength: 100,
      theta: 30,
      phi: 45,
      x1: 30,
      midY: 0,
      midZ: 20,
    });
    expect(res.status).toBe('fully_determined');
    const rl = res.resolvedLine!;
    expect(nearlyEqual((rl.p1.y + rl.p2.y) / 2, 0, 1e-3)).toBe(true);
    expect(nearlyEqual((rl.p1.z + rl.p2.z) / 2, 20, 1e-3)).toBe(true);
    expect(rl.p1.y).toBeLessThan(0);
    expect(rl.p2.y).toBeGreaterThan(0);
  });

  it('solves Profile Plane Line (θ + φ = 90°) with zero projector distance', () => {
    const res = solveLine({
      lineCase: 'profile_plane',
      trueLength: 70,
      theta: 30,
      phi: 60,
      x1: 40,
      y1: 15,
      z1: 10,
    });
    expect(res.status).toBe('fully_determined');
    expect(nearlyEqual(res.resolvedLine!.projectorDist, 0, 1e-3)).toBe(true);
    expect(nearlyEqual(res.resolvedLine!.svLength, 70, 1e-2)).toBe(true);
  });

  it('solves TL=75, TV=65, FV=50 -> derives θ and φ', () => {
    const res = solveLine({ trueLength: 75, tvLength: 65, fvLength: 50, x1: 20, y1: 12, z1: 0 });
    expect(res.status).toBe('fully_determined');
    expect(nearlyEqual(res.resolvedLine!.theta, (Math.acos(65 / 75) * 180) / Math.PI, 0.2)).toBe(true);
    expect(nearlyEqual(res.resolvedLine!.phi, (Math.acos(50 / 75) * 180) / Math.PI, 0.2)).toBe(true);
  });

  it('solves Projectors 50mm apart, A in Q1 (20,30), B in Q3 (-70,-40)', () => {
    const res = solveLine({
      projectorDist: 50,
      x1: 20,
      h1: 20,
      d1: 30,
      quadrantA: 'I',
      h2: 70,
      d2: 40,
      quadrantB: 'III',
    });
    expect(res.status).toBe('fully_determined');
    expect(nearlyEqual(res.resolvedLine!.trueLength, Math.hypot(50, 70, 90), 1e-2)).toBe(true);
  });

  it('solves TL=90, θ=45°, apparent TV angle β=60° -> derives φ', () => {
    const res = solveLine({ trueLength: 90, theta: 45, beta: 60, x1: 20, y1: 12, z1: 0 });
    expect(res.status).toBe('fully_determined');
    const expectedPhi = (Math.asin(Math.cos(Math.PI / 4) * Math.sin(Math.PI / 3)) * 180) / Math.PI;
    expect(nearlyEqual(res.resolvedLine!.phi, expectedPhi, 0.2)).toBe(true);
  });

  it('rejects impossible θ + φ > 90°', () => {
    expect(solveLine({ trueLength: 80, theta: 60, phi: 45 }).status).toBe('inconsistent');
  });
});

describe('Planes & True-Angle Locus Construction (N.D. Bhatt Ch. 12)', () => {
  it('solves 60x30 rectangle whose FV is a 30mm square -> φ = 60°', () => {
    const res = solvePlane({
      shape: 'rectangle',
      restingOn: 'vp_edge',
      width: 60,
      length: 30,
      apparentSquareSide: 30,
      stage3Angle: 30,
    });
    expect(res.status).toBe('fully_determined');
    expect(nearlyEqual(res.resolvedPlane!.phi, 60, 0.2)).toBe(true);
  });

  it('computes apparent angle β = 45° via locus for θ=45°, true median φ=30°', () => {
    const res = solvePlane({
      shape: 'regular_pentagon',
      restingOn: 'hp_corner',
      width: 30,
      theta: 45,
      stage3Angle: 30,
      stage3Ref: 'diagonal_or_median',
      stage3IsApparent: false,
    });
    expect(res.status).toBe('fully_determined');
    expect(res.resolvedPlane!.usedLocus).toBe(true);
    // sin(β) = sin(30°) / cos(45°) = 0.5 / 0.7071 = 0.7071 => β = 45°!
    expect(nearlyEqual(res.resolvedPlane!.apparentStage3Angle, 45, 0.2)).toBe(true);
  });

  it('generates 3-stage Change-of-Position sheet for Hexagon Lamina', () => {
    const obj: EngineeringObject = {
      id: 'hex',
      name: 'Hexagon',
      category: 'plane',
      visible: true,
      color: '#10b981',
      params: {
        category: 'plane',
        data: { shape: 'regular_hexagon', restingOn: 'hp_edge', width: 25, theta: 45, stage3Angle: 60 },
      },
    };
    const solved = solvePlane(obj.params.category === 'plane' ? obj.params.data : ({} as any));
    const sheet = buildMultiStageSheet(obj, solved, 'first-angle');
    expect(sheet.stageCount).toBe(3);
    expect(sheet.lines.some((l) => l.layer === 'projector')).toBe(true);
    expect(sheet.lines.some((l) => l.layer === 'locus')).toBe(true);
  });
});

describe('Solids, Resting Positions, Sectioning & Development (N.D. Bhatt Ch. 13–15)', () => {
  it('grounds Cone lying on generator flat on HP (minZ = 0, apex Z = 0)', () => {
    const params = {
      solidType: 'cone' as const,
      restingOn: 'hp_generator' as const,
      radius: 35,
      height: 90,
    };
    const res = solveSolid(params);
    expect(res.status).toBe('fully_determined');
    const expectedTheta = (Math.atan2(35, 90) * 180) / Math.PI;
    expect(nearlyEqual(res.resolvedSolid!.effectiveTheta, expectedTheta, 0.2)).toBe(true);
    expect(nearlyEqual(res.resolvedSolid!.stage2TiltDeg, 90 + expectedTheta, 0.2)).toBe(true);

    const mesh = buildSolidStageMesh(params, 'Cone', res, 2);
    expect(nearlyEqual(mesh.boundingBox.min.z, 0, 1e-2)).toBe(true);
    // Apex is the last vertex in cone mesh -> must rest on HP (z = 0)!
    const apex = mesh.vertices[mesh.vertices.length - 1];
    expect(nearlyEqual(apex.z, 0, 1e-2)).toBe(true);
  });

  it('computes Solid Stage 3 true-angle locus (θ=45°, true φ=30° -> β=45°) and rejects θ+φ>90°', () => {
    const valid = solveSolid({
      solidType: 'square_prism',
      restingOn: 'hp_base_edge',
      width: 40,
      height: 65,
      theta: 45,
      stage3Angle: 30,
      stage3Ref: 'axis',
      stage3IsApparent: false,
    });
    expect(valid.status).toBe('fully_determined');
    expect(valid.resolvedSolid!.usedLocus).toBe(true);
    expect(nearlyEqual(valid.resolvedSolid!.apparentStage3Angle, 45, 0.2)).toBe(true);

    const invalid = solveSolid({
      solidType: 'square_prism',
      restingOn: 'hp_base_edge',
      width: 40,
      height: 65,
      theta: 60,
      stage3Angle: 45,
      stage3Ref: 'axis',
      stage3IsApparent: false,
    });
    expect(invalid.status).toBe('inconsistent');
  });

  it('handles Freely Suspended Square Pyramid and Cube Solid Diagonal ⊥ HP', () => {
    const susp = solveSolid({
      solidType: 'square_pyramid',
      restingOn: 'hp_freely_suspended',
      width: 35,
      height: 65,
    });
    expect(susp.status).toBe('fully_determined');

    const cubeDiag = solveSolid({
      solidType: 'cube',
      restingOn: 'cube_solid_diagonal_vertical',
      width: 45,
    });
    expect(cubeDiag.status).toBe('fully_determined');
    expect(nearlyEqual(cubeDiag.resolvedSolid!.effectiveTheta, 35.264, 0.1)).toBe(true);
  });

  it('extracts clean silhouette edges for Cylinder and computes section hatching + True Shape + Development', () => {
    const cyl: EngineeringObject = {
      id: 'cyl1',
      name: 'Cylinder',
      category: 'solid',
      visible: true,
      color: '#10b981',
      params: {
        category: 'solid',
        data: {
          solidType: 'cylinder',
          restingOn: 'hp_base',
          radius: 25,
          height: 70,
          sectionEnabled: true,
          sectionPlaneType: 'aip',
          sectionAngle: 45,
          sectionHeight: 35,
          showTrueShape: true,
          showDevelopment: true,
        },
      },
    };
    const solved = solveSolid(cyl.params.category === 'solid' ? cyl.params.data : ({} as any));
    const mesh = buildObjectMesh(cyl, solved);
    const fv = projectMeshToView(mesh, 'front', DEFAULT_SETTINGS);
    expect(fv.edges.some((e) => e.kind === 'section')).toBe(true);

    const sheet = buildMultiStageSheet(cyl, solved, 'first-angle');
    expect(sheet.lines.some((l) => l.layer === 'hatch')).toBe(true);
    expect(sheet.lines.some((l) => l.layer === 'development')).toBe(true);
    expect(sheet.texts.some((t) => t.text.includes('TRUE SHAPE'))).toBe(true);
  });

  it('switches Top View & Side View signs accurately between 1st-Angle and 3rd-Angle', () => {
    const p = vec3(40, 25, 35);
    expect(projectPoint2D(p, 'top', { convention: 'first-angle', auxiliaryAngle: 45 }).v).toBe(-25);
    expect(projectPoint2D(p, 'top', { convention: 'third-angle', auxiliaryAngle: 45 }).v).toBe(25);
    expect(projectPoint2D(p, 'side', { convention: 'first-angle', auxiliaryAngle: 45 }).u).toBe(25);
    expect(projectPoint2D(p, 'side', { convention: 'third-angle', auxiliaryAngle: 45 }).u).toBe(-25);
  });
});

describe('Engineering Curves & Scales (N.D. Bhatt Ch. 4–6)', () => {
  it('constructs Ellipse (e=2/3) with Tangent & Normal and Parabola by Rectangle Method', () => {
    const c = buildConicByEccentricity(50, 2 / 3, 45);
    expect(c.curvePolylines[0].length).toBeGreaterThan(20);
    expect(c.tangentNormal.length).toBe(2);

    const p = buildParabolaRectangle(100, 60);
    expect(p.curvePolylines[0].length).toBeGreaterThan(40);
  });

  it('constructs Cycloid, Epicycloid, Hypocycloid, Involute & Archimedean Spiral', () => {
    expect(buildCycloid(50, 45).tangentNormal.length).toBe(2);
    expect(buildTrochoidCircle('epicycloid', 40, 140).curvePolylines[0].length).toBeGreaterThan(50);
    expect(buildTrochoidCircle('hypocycloid', 40, 140).curvePolylines[0].length).toBeGreaterThan(50);
    expect(buildInvoluteCircle(50).tangentNormal.length).toBe(2);
    expect(buildArchimedeanSpiral(70, 10, 1).curvePolylines[0].length).toBeGreaterThan(50);
  });

  it('computes Diagonal Scale LOS = RF * MaxLength', () => {
    const s = computeScale(3, 200, 6, 6, 10, 10);
    expect(nearlyEqual(s.lengthOfScaleCm, 9, 1e-3)).toBe(true);
  });
});

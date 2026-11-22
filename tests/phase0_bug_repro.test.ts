import { describe, expect, it } from 'vitest';
import {
  solveLine,
  solvePlane,
  solveSolid,
} from '../src/solver/constraintSolver';
import {
  buildPlaneStageMesh,
  buildSolidStageMesh,
} from '../src/geometry/builders';
import { projectPoint2D } from '../src/projections/projector';
import { buildMultiStageSheet } from '../src/projections/multiStageSheet';
import { angleBetweenDeg, dot, sub, vec3 } from '../src/geometry/math';
import { applyGlobalScale, detectQuadrant, hasGlobalScale, parseScaleRatio } from '../src/engineering/units';
import { buildIsometricView } from '../src/core/pictorial/isometric';
import { buildObliqueView } from '../src/core/pictorial/oblique';
import { buildPerspectiveView } from '../src/core/pictorial/perspective';
import { computeSolidIntersection } from '../src/core/intersection/intersectionEngine';
import { EngineeringObject } from '../src/types/engineering';

describe('Phase 0 — Bug Verification Suite (All 18 B1–B14 Tests MUST PASS in v4)', () => {
  it('B1a: Plane resting on HP edge — solved normal matches actual 3D mesh normal', () => {
    const params = {
      shape: 'regular_hexagon' as const,
      restingOn: 'hp_edge' as const,
      width: 40,
      theta: 45,
      stage3Angle: 60,
      stage3Ref: 'resting_edge' as const,
    };
    const solved = solvePlane(params);
    const mesh = buildPlaneStageMesh(params, 'Hex', solved, 3);
    const solvedNormal = solved.resolvedPlane!.normal;
    const meshNormal = mesh.faces[0].normal;
    expect(Math.abs(dot(solvedNormal, meshNormal))).toBeCloseTo(1, 5);
  });

  it('B1b: Plane with both surface inclinations θ+φ < 90° is rejected (cos²θ+cos²φ ≤ 1)', () => {
    const res = solvePlane({
      shape: 'circle',
      restingOn: 'hp_corner',
      radius: 35,
      theta: 30,
      phi: 30,
    });
    expect(res.status).toBe('inconsistent');
  });

  it('B1c: Solid resting on VP — solved axis direction matches built 3D mesh axis direction', () => {
    const params = {
      solidType: 'square_prism' as const,
      restingOn: 'vp_base_edge' as const,
      width: 40,
      height: 60,
      phi: 30,
      stage3Angle: 45,
      stage3Ref: 'axis' as const,
      stage3IsApparent: true,
    };
    const solved = solveSolid(params);
    const mesh = buildSolidStageMesh(params, 'PrismVP', solved, 3);
    const axisEdge = mesh.edges.find((e) => e.kind === 'axis')!;
    const meshAxis = sub(axisEdge.end, axisEdge.start);
    const solvedAxis = sub(solved.resolvedSolid!.axisEnd, solved.resolvedSolid!.axisStart);
    expect(angleBetweenDeg(meshAxis, solvedAxis)).toBeLessThan(1e-3);
  });

  it('B2: Solid resting on longer edge (W13-25 / E13b.7) honors entered θ=45°', () => {
    const res = solveSolid({
      solidType: 'pentagonal_prism',
      restingOn: 'hp_longer_edge',
      width: 45,
      height: 70,
      theta: 45,
      stage3Angle: 30,
    });
    expect(res.resolvedSolid!.effectiveTheta).toBeCloseTo(45, 3);
  });

  it('B3a: solvePlane reports underdetermined when required dimensions are omitted', () => {
    const res = solvePlane({ shape: 'rectangle' });
    expect(res.status).toBe('underdetermined');
    expect(res.missingParams.length).toBeGreaterThan(0);
  });

  it('B3b: solveSolid reports underdetermined when required dimensions are omitted', () => {
    const res = solveSolid({ solidType: 'square_prism' });
    expect(res.status).toBe('underdetermined');
    expect(res.missingParams.length).toBeGreaterThan(0);
  });

  it('B4: solveLine Case C honors quadrantB=III (E10b.8)', () => {
    const res = solveLine({
      trueLength: 65,
      theta: 30,
      phi: 60,
      x1: 30,
      h1: 0,
      d1: 15,
      quadrantA: 'HP',
      quadrantB: 'III',
    });
    expect(res.status).toBe('fully_determined');
    expect(detectQuadrant(res.resolvedLine!.p2)).toBe('III');
    expect(res.resolvedLine!.p2.y).toBeLessThan(0);
    expect(res.resolvedLine!.p2.z).toBeLessThan(0);
  });

  it('B5: LineParams accepts trace constraints (HT/VT distances, W10-27)', () => {
    const res = solveLine({
      trueLength: 130,
      d1: 55,
      quadrantA: 'I',
      htDistVP: 40,
      vtDistHP: 50,
      traceProjectorDist: 120,
    });
    expect(res.status).toBe('fully_determined');
  });

  it('B6: solveLine solves TL + apparent α + apparent β (without projectorDist)', () => {
    const res = solveLine({
      trueLength: 100,
      alpha: 45,
      beta: 30,
      x1: 20,
      y1: 15,
      z1: 10,
    });
    expect(res.status).toBe('fully_determined');
    expect(res.resolvedLine!.alpha).toBeCloseTo(45, 1);
    expect(res.resolvedLine!.beta).toBeCloseTo(30, 1);
  });

  it('B7: Solid with base in VP and edge at 30° to HP (W13-8) renders rotated stage on sheet', () => {
    const obj: EngineeringObject = {
      id: 'w13-8',
      name: 'W13-8 Pyramid',
      category: 'solid',
      visible: true,
      color: '#10b981',
      params: {
        category: 'solid',
        data: {
          solidType: 'square_pyramid',
          restingOn: 'vp_base',
          width: 40,
          height: 65,
          stage3Angle: 30,
          stage3Ref: 'resting_edge',
        },
      },
    };
    const res = solveSolid(obj.params.category === 'solid' ? obj.params.data : ({} as any));
    const sheet = buildMultiStageSheet(obj, res, 'first-angle');
    expect(sheet.stageCount).toBeGreaterThanOrEqual(2);
  });

  it('B8a: Section of inclined solid (W14-27) cuts inclined mesh, not Stage 1', () => {
    const cone: EngineeringObject = {
      id: 'w14-27',
      name: 'Cone',
      category: 'solid',
      visible: true,
      color: '#10b981',
      params: {
        category: 'solid',
        data: {
          solidType: 'cone',
          restingOn: 'hp_generator',
          radius: 25,
          height: 65,
          sectionEnabled: true,
          sectionPlaneType: 'horizontal',
          sectionHeight: 12,
          showTrueShape: true,
        },
      },
    };
    const solved = solveSolid(cone.params.category === 'solid' ? cone.params.data : ({} as any));
    const sheet = buildMultiStageSheet(cone, solved, 'first-angle');
    const stage2X = sheet.texts.find((t) => t.text.includes('STAGE 2'))!.x;
    const vtLabel = sheet.texts.find((t) => t.text.includes('V.T.'))!;
    expect(vtLabel.x).toBeGreaterThan(stage2X);
  });

  it('B8b: Frustum of pyramid development uses full apex slant', () => {
    const frustum: EngineeringObject = {
      id: 'frustum-dev',
      name: 'Frustum',
      category: 'solid',
      visible: true,
      color: '#10b981',
      params: {
        category: 'solid',
        data: {
          solidType: 'frustum_pyramid',
          sides: 4,
          width: 50,
          topRadius: 15,
          height: 60,
          sectionEnabled: true,
          sectionPlaneType: 'horizontal',
          sectionHeight: 30,
          showDevelopment: true,
        },
      },
    };
    const solved = solveSolid(frustum.params.category === 'solid' ? frustum.params.data : ({} as any));
    const sheet = buildMultiStageSheet(frustum, solved, 'first-angle');
    const baseR = 50 / (2 * Math.sin(Math.PI / 4));
    const trueFullH = (60 * baseR) / (baseR - 15);
    const trueSlant = Math.hypot(baseR, trueFullH);
    const devLines = sheet.lines.filter((l) => l.layer === 'development');
    const maxLen = Math.max(...devLines.map((l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1)));
    expect(maxLen).toBeCloseTo(trueSlant - Math.hypot(15, trueFullH - 60), 0);
  });

  it('B9: Auxiliary projection supports AVP (rotation about Z, preserving Z height)', () => {
    const p = vec3(30, 40, 50);
    const proj = projectPoint2D(p, 'auxiliary', {
      convention: 'first-angle',
      auxiliaryAngle: 60,
      auxiliaryType: 'avp',
    });
    expect(proj.v).toBeCloseTo(50, 5);
  });

  it('B10: Cylinder/cone uses >= 64-segment analytic circle circumference', () => {
    const mesh = buildSolidStageMesh(
      { solidType: 'cylinder', radius: 25, height: 60, restingOn: 'hp_base' },
      'Cyl',
      undefined,
      1
    );
    const baseVerts = mesh.vertices.filter((v) => Math.abs(v.z) < 1e-6);
    expect(baseVerts.length).toBeGreaterThanOrEqual(64);
  });

  it('B11: Plane circle uses >= 64-segment analytic circle', () => {
    const mesh = buildPlaneStageMesh(
      { shape: 'circle', radius: 25, restingOn: 'hp_corner' },
      'Circle',
      undefined,
      1
    );
    expect(mesh.vertices.length).toBeGreaterThanOrEqual(64);
  });

  it('B12: Intersection, Isometric, Oblique & Perspective modules exist and compute valid outputs', () => {
    const cubeMesh = buildSolidStageMesh({ solidType: 'cube', width: 40, restingOn: 'hp_base' }, 'Cube', undefined, 1);
    const iso = buildIsometricView(cubeMesh, 'projection', 'Cube');
    const obl = buildObliqueView(cubeMesh, 'cabinet', 45, 'Cube');
    const persp = buildPerspectiveView(cubeMesh, { stationDistFromPP: 160, eyeHeightAboveGP: 80, stationOffsetX: 0, objectYawDeg: 30 }, 'Cube');
    const inter = computeSolidIntersection({ pairType: 'cylinder_cylinder', mainRadius: 40, mainHeight: 100, penRadius: 25, penLength: 120, axisOffset: 6, penHeight: 50 });

    expect(iso.edges.length).toBeGreaterThan(0);
    expect(obl.edges.length).toBeGreaterThan(0);
    expect(persp.edges.length).toBeGreaterThan(0);
    expect(inter.fvCurves.length).toBeGreaterThan(0);
  });

  it('B13: Projector supports BOTH left_side and right_side views within 1st-angle convention', () => {
    const p = vec3(40, 25, 35);
    const lhsv = projectPoint2D(p, 'left_side', { convention: 'first-angle', auxiliaryAngle: 45 });
    const rhsv = projectPoint2D(p, 'right_side', { convention: 'first-angle', auxiliaryAngle: 45 });
    expect(lhsv).toBeDefined();
    expect(rhsv).toBeDefined();
    expect(lhsv.u).toBe(25);
    expect(rhsv.u).toBe(-25);
  });

  it('B14: Units module supports global scale factor (e.g. 1:250)', () => {
    expect(hasGlobalScale).toBe(true);
    expect(parseScaleRatio('1:250')).toBeCloseTo(1 / 250, 6);
    expect(applyGlobalScale(1000, parseScaleRatio('1:250'))).toBeCloseTo(4, 5);
  });
});

import {
  CurveParams,
  EngineeringObject,
  LineParams,
  PlaneParams,
  PointParams,
  Quadrant,
  SolidParams,
  SolutionAlternative,
  SolverResult,
  Vec3,
} from '../types/engineering';
import { degToRad, detectQuadrant, quadrantSigns, radToDeg } from '../engineering/units';
import {
  EPS,
  intersectLinePlane,
  mat4Identity,
  mat4Multiply,
  mat4RotationX,
  mat4RotationY,
  mat4RotationZ,
  normalize,
  planeFromPointNormal,
  transformDirection,
  vec3,
} from '../geometry/math';

const TOL = 1e-3;

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function applyQuadrantSign(
  val: number | null | undefined,
  q: Quadrant | null | undefined,
  axis: 'y' | 'z'
): number | null {
  if (!isNum(val)) return null;
  if (!q) return val;
  const { signY, signZ } = quadrantSigns(q);
  const s = axis === 'y' ? signY : signZ;
  if (s === 0) return 0;
  return Math.abs(val) * s;
}

export function getSolidSideCount(s: SolidParams): number {
  switch (s.solidType) {
    case 'tetrahedron':
    case 'triangular_prism':
    case 'triangular_pyramid':
      return 3;
    case 'cube':
    case 'cuboid':
    case 'octahedron':
    case 'square_prism':
    case 'square_pyramid':
      return 4;
    case 'pentagonal_prism':
    case 'pentagonal_pyramid':
      return 5;
    case 'hexagonal_prism':
    case 'hexagonal_pyramid':
      return 6;
    case 'cylinder':
    case 'hollow_cylinder':
    case 'cone':
    case 'frustum_cone':
      return 64;
    case 'frustum_pyramid':
    case 'prism':
    case 'hollow_prism':
    case 'pyramid':
      return Math.max(3, Math.round(s.sides ?? 4));
    default:
      return 24;
  }
}

export function getSolidBaseRadius(s: SolidParams): number {
  const w = isNum(s.width) ? s.width : 35;
  const r = isNum(s.radius) ? s.radius : 25;
  const n = getSolidSideCount(s);
  switch (s.solidType) {
    case 'cylinder':
    case 'hollow_cylinder':
    case 'cone':
    case 'frustum_cone':
    case 'sphere':
    case 'hemisphere':
      return r;
    case 'prism':
    case 'hollow_prism':
    case 'pyramid':
      return isNum(s.width) ? w / (2 * Math.sin(Math.PI / n)) : r;
    case 'hexagonal_prism':
    case 'hexagonal_pyramid':
      return w;
    case 'cuboid':
      return Math.hypot(w / 2, (isNum(s.length) ? s.length : 35) / 2);
    default:
      return w / (2 * Math.sin(Math.PI / n));
  }
}

export function getSolidApothem(s: SolidParams): number {
  const w = isNum(s.width) ? s.width : 35;
  const r = isNum(s.radius) ? s.radius : 25;
  const n = getSolidSideCount(s);
  switch (s.solidType) {
    case 'cylinder':
    case 'hollow_cylinder':
    case 'cone':
    case 'frustum_cone':
    case 'sphere':
    case 'hemisphere':
      return r;
    case 'cuboid':
    case 'cube':
    case 'square_prism':
    case 'square_pyramid':
      return w / 2;
    default:
      return getSolidBaseRadius(s) * Math.cos(Math.PI / n);
  }
}

export function getSolidEffectiveHeight(s: SolidParams): number {
  const w = isNum(s.width) ? s.width : 35;
  const r = isNum(s.radius) ? s.radius : 25;
  if (s.solidType === 'cube') return w;
  if (s.solidType === 'tetrahedron') return w * Math.sqrt(2 / 3);
  if (s.solidType === 'octahedron') return w * Math.SQRT2;
  if (s.solidType === 'sphere') return 2 * r;
  if (s.solidType === 'hemisphere') return r;
  return isNum(s.height) ? s.height : 60;
}

export function solveObject(obj: EngineeringObject, selectedAlternativeIndex = 0): SolverResult {
  switch (obj.params.category) {
    case 'point':
      return solvePoint(obj.params.data, selectedAlternativeIndex);
    case 'line':
      return solveLine(obj.params.data, selectedAlternativeIndex);
    case 'plane':
      return solvePlane(obj.params.data);
    case 'solid':
      return solveSolid(obj.params.data);
    case 'curve':
      return solveCurve(obj.params.data);
  }
}

export function solvePoint(p: PointParams, selectedAlt = 0): SolverResult {
  const missing: Array<{ name: string; reason: string }> = [];
  const inconsistencies: string[] = [];
  const alternatives: SolutionAlternative[] = [];

  let x = isNum(p.x) ? p.x : null;
  let y = isNum(p.y) ? p.y : null;
  let z = isNum(p.z) ? p.z : null;

  let absY = y !== null ? Math.abs(y) : isNum(p.distVP) ? Math.abs(p.distVP) : null;
  let absZ = z !== null ? Math.abs(z) : isNum(p.distHP) ? Math.abs(p.distHP) : null;
  const distXY = isNum(p.distXY) ? Math.abs(p.distXY) : null;

  if (isNum(p.distHP) && p.distHP < 0) inconsistencies.push('Distance from HP cannot be negative.');
  if (isNum(p.distVP) && p.distVP < 0) inconsistencies.push('Distance from VP cannot be negative.');
  if (y !== null && isNum(p.distVP) && Math.abs(Math.abs(y) - p.distVP) > TOL) {
    inconsistencies.push(`Y (${y}) conflicts with Distance from VP (${p.distVP}).`);
  }
  if (z !== null && isNum(p.distHP) && Math.abs(Math.abs(z) - p.distHP) > TOL) {
    inconsistencies.push(`Z (${z}) conflicts with Distance from HP (${p.distHP}).`);
  }

  if (distXY !== null) {
    if (absY !== null && absZ === null) {
      if (absY > distXY + TOL) {
        inconsistencies.push(`Distance from VP (${absY}) cannot exceed distance from XY (${distXY}).`);
      } else {
        absZ = Math.sqrt(Math.max(0, distXY * distXY - absY * absY));
      }
    } else if (absZ !== null && absY === null) {
      if (absZ > distXY + TOL) {
        inconsistencies.push(`Distance from HP (${absZ}) cannot exceed distance from XY (${distXY}).`);
      } else {
        absY = Math.sqrt(Math.max(0, distXY * distXY - absZ * absZ));
      }
    } else if (absY !== null && absZ !== null) {
      const expectedXY = Math.hypot(absY, absZ);
      if (Math.abs(expectedXY - distXY) > TOL) {
        inconsistencies.push(`Distance from XY (${distXY}) conflicts with √(distVP² + distHP²) = ${expectedXY.toFixed(2)}.`);
      }
    }
  }

  if (p.quadrant && y !== null && z !== null) {
    const detected = detectQuadrant(vec3(x ?? 0, y, z));
    if (detected !== p.quadrant) {
      inconsistencies.push(`(Y=${y}, Z=${z}) is in Quadrant ${detected}, conflicting with selected Quadrant ${p.quadrant}.`);
    }
  }

  if (p.quadrant) {
    const { signY, signZ } = quadrantSigns(p.quadrant);
    if (y === null && absY !== null) y = signY === 0 ? 0 : signY * absY;
    if (z === null && absZ !== null) z = signZ === 0 ? 0 : signZ * absZ;
    if (p.quadrant === 'HP' && z === null) z = 0;
    if (p.quadrant === 'VP' && y === null) y = 0;
    if (p.quadrant === 'XY') {
      if (y === null) y = 0;
      if (z === null) z = 0;
    }
  }

  if ((y === null || z === null) && absY !== null && absZ !== null && !p.quadrant) {
    const candidates: Quadrant[] =
      absY > TOL && absZ > TOL
        ? ['I', 'II', 'III', 'IV']
        : absZ <= TOL && absY > TOL
        ? ['HP']
        : absY <= TOL && absZ > TOL
        ? ['VP']
        : ['XY'];

    if (candidates.length > 1) {
      candidates.forEach((q, idx) => {
        const { signY, signZ } = quadrantSigns(q);
        const cy = y !== null ? y : signY * absY!;
        const cz = z !== null ? z : signZ * absZ!;
        alternatives.push({
          id: `quad_${q}`,
          label: `Quadrant ${q}`,
          description: `Y = ${cy.toFixed(2)}, Z = ${cz.toFixed(2)}`,
          resolvedValues: { y: cy, z: cz, quadrant: q },
        });
        if (idx === selectedAlt) {
          y = cy;
          z = cz;
        }
      });
    }
  }

  if (x === null) missing.push({ name: 'X coordinate', reason: 'Locates the point along the XY ground line.' });
  if (y === null) missing.push({ name: 'Y / Dist from VP', reason: 'Locates the point relative to VP.' });
  if (z === null) missing.push({ name: 'Z / Dist from HP', reason: 'Locates the point relative to HP.' });

  const finalX = x ?? 0;
  const finalY = y ?? 0;
  const finalZ = z ?? 0;
  const computedXY = Math.hypot(finalY, finalZ);
  const resolvedQuadrant = detectQuadrant(vec3(finalX, finalY, finalZ));

  const calculated: Record<string, number | string | Vec3 | null> = {
    x: x !== null ? finalX : null,
    y: y !== null ? finalY : null,
    z: z !== null ? finalZ : null,
    distHP: absZ,
    distVP: absY,
    distXY: absY !== null && absZ !== null ? computedXY : distXY,
    quadrant: y !== null && z !== null ? resolvedQuadrant : p.quadrant ?? null,
    frontProjection: y !== null && z !== null ? vec3(finalX, 0, finalZ) : null,
    topProjection: y !== null && z !== null ? vec3(finalX, finalY, 0) : null,
    sideProjection: y !== null && z !== null ? vec3(0, finalY, finalZ) : null,
  };

  if (inconsistencies.length > 0) {
    return {
      status: 'inconsistent',
      message: inconsistencies[0],
      missingParams: missing,
      inconsistencies,
      alternatives,
      selectedAlternativeIndex: selectedAlt,
      calculated,
    };
  }
  if (missing.length > 0) {
    return {
      status: 'underdetermined',
      message: `Missing ${missing.map((m) => m.name).join(', ')}.`,
      missingParams: missing,
      inconsistencies,
      alternatives,
      selectedAlternativeIndex: selectedAlt,
      calculated,
      resolvedPoint: vec3(finalX, finalY, finalZ),
    };
  }
  if (alternatives.length > 1) {
    return {
      status: 'multiple_solutions',
      message: `4 valid quadrant positions exist for |Y|=${absY?.toFixed(1)}, |Z|=${absZ?.toFixed(1)}.`,
      missingParams: [],
      inconsistencies: [],
      alternatives,
      selectedAlternativeIndex: selectedAlt,
      calculated,
      resolvedPoint: vec3(finalX, finalY, finalZ),
    };
  }
  return {
    status: 'fully_determined',
    message: `Point located in Quadrant ${resolvedQuadrant}.`,
    missingParams: [],
    inconsistencies: [],
    alternatives: [],
    selectedAlternativeIndex: 0,
    calculated,
    resolvedPoint: vec3(finalX, finalY, finalZ),
  };
}

/**
 * Complete N.D. Bhatt Ch. 10 Straight-Line Constraint Solver (v4):
 * - B4: Full sign-branch enumeration honoring quadrantA & quadrantB (e.g. E10b.8)
 * - B5: Direct trace-driven solver (htDistVP, vtDistHP, traceProjectorDist — W10-27)
 * - B6: Closed-form TL + apparent α + apparent β solver without projectorDist
 */
export function solveLine(l: LineParams, selectedAlt = 0): SolverResult {
  const missing: Array<{ name: string; reason: string }> = [];
  const inconsistencies: string[] = [];
  const alternatives: SolutionAlternative[] = [];

  if (l.lineCase === 'perpendicular_both') {
    inconsistencies.push('A straight line cannot be simultaneously perpendicular to both HP and VP.');
  }

  let y1Signed = isNum(l.y1) ? l.y1 : applyQuadrantSign(l.d1, l.quadrantA, 'y');
  let z1Signed = isNum(l.z1) ? l.z1 : applyQuadrantSign(l.h1, l.quadrantA, 'z');
  let y2Signed = isNum(l.y2) ? l.y2 : applyQuadrantSign(l.d2, l.quadrantB, 'y');
  let z2Signed = isNum(l.z2) ? l.z2 : applyQuadrantSign(l.h2, l.quadrantB, 'z');

  if (l.lineCase === 'contained_hp') {
    z1Signed = 0;
    z2Signed = z2Signed ?? 0;
  } else if (l.lineCase === 'contained_vp') {
    y1Signed = 0;
    y2Signed = y2Signed ?? 0;
  } else if (l.lineCase === 'contained_xy') {
    y1Signed = 0;
    z1Signed = 0;
    y2Signed = 0;
    z2Signed = 0;
  }

  const x1Base = isNum(l.x1) ? l.x1 : 25;
  const hasExplicitX2 = isNum(l.x2);
  const hasProjDist = isNum(l.projectorDist);

  // Case T (B5): Trace-driven line solver (e.g. W10-27: htDistVP, vtDistHP, traceProjectorDist + TL + one coordinate)
  if (isNum(l.htDistVP) && isNum(l.vtDistHP) && isNum(l.traceProjectorDist) && isNum(l.trueLength)) {
    const yHT = l.htSide === 'behind' ? -Math.abs(l.htDistVP) : l.htDistVP;
    const zVT = l.vtSide === 'below' ? -Math.abs(l.vtDistHP) : l.vtDistHP;
    const dTr = Math.abs(l.traceProjectorDist);
    const Ltr = Math.hypot(dTr, yHT, zVT);
    if (Ltr < EPS) {
      inconsistencies.push('HT and VT coincide with zero distance; line direction is undetermined.');
    } else {
      const vtPt = vec3(x1Base, 0, zVT);
      const htPt = vec3(x1Base + dTr, yHT, 0);
      const ux = (htPt.x - vtPt.x) / Ltr;
      const uy = (htPt.y - vtPt.y) / Ltr;
      const uz = (htPt.z - vtPt.z) / Ltr;

      let p1: Vec3;
      if (y1Signed !== null && Math.abs(uy) > EPS) {
        const tA = (y1Signed - vtPt.y) / uy;
        p1 = vec3(vtPt.x + tA * ux, y1Signed, vtPt.z + tA * uz);
      } else if (z1Signed !== null && Math.abs(uz) > EPS) {
        const tA = (z1Signed - vtPt.z) / uz;
        p1 = vec3(vtPt.x + tA * ux, vtPt.y + tA * uy, z1Signed);
      } else {
        p1 = vtPt;
      }
      const dirSign = selectedAlt === 1 ? 1 : -1;
      const p2 = vec3(p1.x + dirSign * l.trueLength * ux, p1.y + dirSign * l.trueLength * uy, p1.z + dirSign * l.trueLength * uz);
      return finalizeLineFromEndpoints(p1, p2, l, inconsistencies);
    }
  }

  // Case A: Both endpoints Y,Z known + X2 or projectorDist
  if (
    y1Signed !== null &&
    z1Signed !== null &&
    y2Signed !== null &&
    z2Signed !== null &&
    (hasExplicitX2 || hasProjDist)
  ) {
    const p1 = vec3(x1Base, y1Signed, z1Signed);
    const p2 = vec3(hasExplicitX2 ? l.x2! : x1Base + l.projectorDist!, y2Signed, z2Signed);
    return finalizeLineFromEndpoints(p1, p2, l, inconsistencies);
  }

  // Case B: Both endpoints Y,Z known + True Length L
  if (
    y1Signed !== null &&
    z1Signed !== null &&
    y2Signed !== null &&
    z2Signed !== null &&
    isNum(l.trueLength)
  ) {
    const dy = y2Signed - y1Signed;
    const dz = z2Signed - z1Signed;
    const L = l.trueLength;
    const rem = L * L - dy * dy - dz * dz;
    if (rem < -TOL) {
      inconsistencies.push(
        `True Length (${L}) is too short for ΔY=${Math.abs(dy).toFixed(1)} and ΔZ=${Math.abs(dz).toFixed(1)} (min L = ${Math.hypot(dy, dz).toFixed(2)}).`
      );
    } else {
      const dx = Math.sqrt(Math.max(0, rem));
      const p1 = vec3(x1Base, y1Signed, z1Signed);
      const p2 = vec3(x1Base + dx, y2Signed, z2Signed);
      return finalizeLineFromEndpoints(p1, p2, l, inconsistencies);
    }
  }

  // Case C: Parameter / Projection / Apparent Angle / Midpoint Mixed Solver
  let L = isNum(l.trueLength) ? l.trueLength : null;
  let theta = isNum(l.theta) ? l.theta : null;
  let phi = isNum(l.phi) ? l.phi : null;
  let fvLen = isNum(l.fvLength) ? l.fvLength : null;
  let tvLen = isNum(l.tvLength) ? l.tvLength : null;
  const alphaIn = isNum(l.alpha) ? l.alpha : null;
  const betaIn = isNum(l.beta) ? l.beta : null;

  if (l.lineCase === 'parallel_hp_vp' || l.lineCase === 'contained_xy') {
    theta = theta ?? 0;
    phi = phi ?? 0;
  } else if (l.lineCase === 'parallel_hp_inclined_vp' || l.lineCase === 'contained_hp') {
    theta = theta ?? 0;
  } else if (l.lineCase === 'parallel_vp_inclined_hp' || l.lineCase === 'contained_vp') {
    phi = phi ?? 0;
  } else if (l.lineCase === 'perpendicular_hp') {
    theta = theta ?? 90;
    phi = phi ?? 0;
  } else if (l.lineCase === 'perpendicular_vp') {
    theta = theta ?? 0;
    phi = phi ?? 90;
  } else if (l.lineCase === 'profile_plane') {
    if (theta !== null && phi === null) phi = 90 - theta;
    else if (phi !== null && theta === null) theta = 90 - phi;
    else if (theta === null && phi === null) {
      theta = 45;
      phi = 45;
    }
  }

  if (L !== null && L <= 0) inconsistencies.push('True Length must be positive.');

  // Iterative constraint propagation (5 passes)
  for (let pass = 0; pass < 5; pass++) {
    // B6: Closed-form TL + apparent α + apparent β (without projectorDist!)
    if (L !== null && alphaIn !== null && betaIn !== null && (theta === null || phi === null)) {
      if (alphaIn >= 90 - EPS || betaIn >= 90 - EPS) {
        if (alphaIn >= 90 - EPS && betaIn >= 90 - EPS) {
          // Profile plane line (dx = 0): need one more constraint
        }
      } else {
        const tanA = Math.tan(degToRad(alphaIn));
        const tanB = Math.tan(degToRad(betaIn));
        const dxCalc = L / Math.sqrt(1 + tanA * tanA + tanB * tanB);
        const dzCalc = dxCalc * tanA;
        const dyCalc = dxCalc * tanB;
        if (theta === null) theta = radToDeg(Math.asin(Math.min(1, dzCalc / L)));
        if (phi === null) phi = radToDeg(Math.asin(Math.min(1, dyCalc / L)));
      }
    }

    if (hasProjDist && alphaIn !== null && fvLen === null && Math.abs(Math.cos(degToRad(alphaIn))) > EPS) {
      fvLen = Math.abs(l.projectorDist!) / Math.cos(degToRad(alphaIn));
    }
    if (hasProjDist && betaIn !== null && tvLen === null && Math.abs(Math.cos(degToRad(betaIn))) > EPS) {
      tvLen = Math.abs(l.projectorDist!) / Math.cos(degToRad(betaIn));
    }
    if (fvLen !== null && alphaIn !== null && tvLen !== null && betaIn !== null && L === null) {
      const dx1 = fvLen * Math.cos(degToRad(alphaIn));
      const dz1 = fvLen * Math.sin(degToRad(alphaIn));
      const dy1 = tvLen * Math.sin(degToRad(betaIn));
      L = Math.hypot(dx1, dy1, dz1);
    }
    if (z1Signed !== null && z2Signed !== null && L !== null && theta === null) {
      const dzAbs = Math.abs(z2Signed - z1Signed);
      if (dzAbs > L + TOL) inconsistencies.push(`|ΔZ| (${dzAbs.toFixed(1)}) exceeds True Length (${L}).`);
      else theta = radToDeg(Math.asin(Math.min(1, dzAbs / L)));
    }
    if (y1Signed !== null && y2Signed !== null && L !== null && phi === null) {
      const dyAbs = Math.abs(y2Signed - y1Signed);
      if (dyAbs > L + TOL) inconsistencies.push(`|ΔY| (${dyAbs.toFixed(1)}) exceeds True Length (${L}).`);
      else phi = radToDeg(Math.asin(Math.min(1, dyAbs / L)));
    }
    if (L !== null && tvLen !== null) {
      if (tvLen > L + TOL) {
        inconsistencies.push(`Top-View Length (${tvLen}) cannot exceed True Length (${L}).`);
      } else {
        const dTheta = radToDeg(Math.acos(Math.min(1, tvLen / L)));
        if (theta !== null && Math.abs(theta - dTheta) > 0.5) {
          inconsistencies.push(`θ (${theta}°) conflicts with cos⁻¹(TV/TL) = ${dTheta.toFixed(2)}°.`);
        } else {
          theta = dTheta;
        }
      }
    }
    if (L !== null && fvLen !== null) {
      if (fvLen > L + TOL) {
        inconsistencies.push(`Front-View Length (${fvLen}) cannot exceed True Length (${L}).`);
      } else {
        const dPhi = radToDeg(Math.acos(Math.min(1, fvLen / L)));
        if (phi !== null && Math.abs(phi - dPhi) > 0.5) {
          inconsistencies.push(`φ (${phi}°) conflicts with cos⁻¹(FV/TL) = ${dPhi.toFixed(2)}°.`);
        } else {
          phi = dPhi;
        }
      }
    }
    if (L === null && tvLen !== null && theta !== null && Math.abs(Math.cos(degToRad(theta))) > EPS) {
      L = tvLen / Math.cos(degToRad(theta));
    }
    if (L === null && fvLen !== null && phi !== null && Math.abs(Math.cos(degToRad(phi))) > EPS) {
      L = fvLen / Math.cos(degToRad(phi));
    }
    if (tvLen === null && L !== null && theta !== null) tvLen = L * Math.cos(degToRad(theta));
    if (fvLen === null && L !== null && phi !== null) fvLen = L * Math.cos(degToRad(phi));

    if (betaIn !== null && tvLen !== null && L !== null && phi === null) {
      const sinPhi = (tvLen * Math.sin(degToRad(betaIn))) / L;
      if (sinPhi > 1 + TOL) {
        inconsistencies.push(`Apparent TV angle β (${betaIn}°) is geometrically impossible with θ (${theta?.toFixed(1)}°).`);
      } else {
        phi = radToDeg(Math.asin(Math.min(1, Math.max(0, sinPhi))));
      }
    }
    if (alphaIn !== null && fvLen !== null && L !== null && theta === null) {
      const sinTheta = (fvLen * Math.sin(degToRad(alphaIn))) / L;
      if (sinTheta > 1 + TOL) {
        inconsistencies.push(`Apparent FV angle α (${alphaIn}°) is geometrically impossible with φ (${phi?.toFixed(1)}°).`);
      } else {
        theta = radToDeg(Math.asin(Math.min(1, Math.max(0, sinTheta))));
      }
    }
    if (hasProjDist && L !== null) {
      const dx = Math.abs(l.projectorDist!);
      if (theta !== null && phi === null) {
        const dz = L * Math.sin(degToRad(theta));
        const dySq = L * L - dx * dx - dz * dz;
        if (dySq < -TOL) inconsistencies.push(`Projector distance (${dx}) conflicts with TL (${L}) and θ (${theta}°).`);
        else phi = radToDeg(Math.asin(Math.min(1, Math.sqrt(Math.max(0, dySq)) / L)));
      } else if (phi !== null && theta === null) {
        const dy = L * Math.sin(degToRad(phi));
        const dzSq = L * L - dx * dx - dy * dy;
        if (dzSq < -TOL) inconsistencies.push(`Projector distance (${dx}) conflicts with TL (${L}) and φ (${phi}°).`);
        else theta = radToDeg(Math.asin(Math.min(1, Math.sqrt(Math.max(0, dzSq)) / L)));
      }
    }
  }

  if (theta !== null && (theta < 0 || theta > 90)) inconsistencies.push('θ with HP must be between 0° and 90°.');
  if (phi !== null && (phi < 0 || phi > 90)) inconsistencies.push('φ with VP must be between 0° and 90°.');
  if (theta !== null && phi !== null && theta + phi > 90 + 0.05) {
    inconsistencies.push(
      `Invalid inclinations: θ + φ = ${(theta + phi).toFixed(1)}° > 90°. Sum of inclinations with HP and VP cannot exceed 90°.`
    );
  }

  if (L === null) missing.push({ name: 'True Length (L)', reason: 'Defines the actual 3D length of the line.' });
  if (theta === null) missing.push({ name: 'Inclination with HP (θ) or TV Length', reason: 'Determines vertical rise ΔZ and Top-View length.' });
  if (phi === null) missing.push({ name: 'Inclination with VP (φ) or FV Length / β', reason: 'Determines depth ΔY and Front-View length.' });

  if (inconsistencies.length > 0) {
    return {
      status: 'inconsistent',
      message: inconsistencies[0],
      missingParams: missing,
      inconsistencies,
      alternatives: [],
      selectedAlternativeIndex: 0,
      calculated: { trueLength: L, theta, phi, fvLength: fvLen, tvLength: tvLen },
    };
  }

  if (missing.length > 0) {
    return {
      status: 'underdetermined',
      message: `Missing ${missing.map((m) => m.name).join(', ')}.`,
      missingParams: missing,
      inconsistencies: [],
      alternatives: [],
      selectedAlternativeIndex: 0,
      calculated: { trueLength: L, theta, phi, fvLength: fvLen, tvLength: tvLen },
    };
  }

  const finalL = L!;
  const finalTheta = theta!;
  const finalPhi = phi!;
  const dz = finalL * Math.sin(degToRad(finalTheta));
  const dy = finalL * Math.sin(degToRad(finalPhi));
  const dx = Math.sqrt(Math.max(0, finalL * finalL - dy * dy - dz * dz));

  let p1: Vec3;
  let p2: Vec3;

  const anchor = l.anchorType ?? 'endA';
  if (anchor === 'midpoint') {
    const mx = x1Base + dx / 2;
    const my = isNum(l.midY) ? l.midY : 0;
    const mz = isNum(l.midZ) ? l.midZ : 20;
    p1 = vec3(mx - dx / 2, my - dy / 2, mz - dz / 2);
    p2 = vec3(mx + dx / 2, my + dy / 2, mz + dz / 2);
  } else if (anchor === 'endB') {
    const bx = isNum(l.x2) ? l.x2 : 85;
    const by = y2Signed ?? 40;
    const bz = z2Signed ?? 0;
    p2 = vec3(bx, by, bz);
    const zSign = selectedAlt === 1 ? -1 : 1;
    p1 = vec3(bx - dx, by - dy, bz + zSign * dz);
  } else {
    // B4: Enumerate all 4 (dySign, dzSign) branches and filter by quadrantB if provided!
    const ay = y1Signed ?? 20;
    const az = z1Signed ?? 15;
    p1 = vec3(x1Base, ay, az);

    const signCombos: Array<{ sy: 1 | -1; sz: 1 | -1; label: string }> = [
      { sy: 1, sz: 1, label: 'Forward (+ΔY), Upward (+ΔZ)' },
      { sy: 1, sz: -1, label: 'Forward (+ΔY), Downward (-ΔZ)' },
      { sy: -1, sz: 1, label: 'Backward (-ΔY), Upward (+ΔZ)' },
      { sy: -1, sz: -1, label: 'Backward (-ΔY), Downward (-ΔZ)' },
    ];

    const matching = signCombos
      .map((c) => ({
        ...c,
        candP2: vec3(x1Base + dx, ay + c.sy * dy, az + c.sz * dz),
      }))
      .filter((c) => {
        if (!l.quadrantB) return true;
        return detectQuadrant(c.candP2) === l.quadrantB;
      });

    if (l.quadrantB && matching.length === 0) {
      return {
        status: 'inconsistent',
        message: `No valid endpoint B exists in Quadrant ${l.quadrantB} from A(${p1.x.toFixed(1)}, ${p1.y.toFixed(1)}, ${p1.z.toFixed(1)}) with TL=${finalL}, θ=${finalTheta.toFixed(1)}°, φ=${finalPhi.toFixed(1)}°.`,
        missingParams: [],
        inconsistencies: [`Quadrant ${l.quadrantB} unreachable for B.`],
        alternatives: [],
        selectedAlternativeIndex: 0,
        calculated: { trueLength: finalL, theta: finalTheta, phi: finalPhi },
      };
    }

    const chosen = matching[Math.min(selectedAlt, matching.length - 1)] ?? matching[0];
    p2 = chosen.candP2;

    if (matching.length > 1 && finalTheta > TOL && finalPhi > TOL) {
      matching.forEach((m, idx) => {
        alternatives.push({
          id: `branch_${idx}`,
          label: `${m.label} [Q${detectQuadrant(m.candP2)}]`,
          description: `P2 = (${m.candP2.x.toFixed(1)}, ${m.candP2.y.toFixed(1)}, ${m.candP2.z.toFixed(1)})`,
          resolvedValues: { y2: m.candP2.y, z2: m.candP2.z },
        });
      });
    }
  }

  const res = finalizeLineFromEndpoints(p1, p2, l, []);
  res.alternatives = alternatives;
  res.selectedAlternativeIndex = selectedAlt;
  return res;
}

function finalizeLineFromEndpoints(
  p1: Vec3,
  p2: Vec3,
  l: LineParams,
  inconsistencies: string[]
): SolverResult {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const trueLength = Math.hypot(dx, dy, dz);
  if (trueLength < EPS) inconsistencies.push('Start and end points are identical (TL = 0).');

  const theta = trueLength > EPS ? radToDeg(Math.asin(Math.min(1, Math.abs(dz) / trueLength))) : 0;
  const phi = trueLength > EPS ? radToDeg(Math.asin(Math.min(1, Math.abs(dy) / trueLength))) : 0;
  const fvLength = Math.hypot(dx, dz);
  const tvLength = Math.hypot(dx, dy);
  const svLength = Math.hypot(dy, dz);
  const alpha = radToDeg(Math.atan2(Math.abs(dz), Math.abs(dx)));
  const beta = radToDeg(Math.atan2(Math.abs(dy), Math.abs(dx)));
  const projectorDist = Math.abs(dx);

  if (isNum(l.trueLength) && Math.abs(l.trueLength - trueLength) > 0.25) {
    inconsistencies.push(`Supplied TL (${l.trueLength}) conflicts with endpoint distance (${trueLength.toFixed(2)}).`);
  }

  const hp = planeFromPointNormal(vec3(0, 0, 0), vec3(0, 0, 1));
  const vp = planeFromPointNormal(vec3(0, 0, 0), vec3(0, 1, 0));
  const htRes = intersectLinePlane(p1, p2, hp);
  const vtRes = intersectLinePlane(p1, p2, vp);
  const ht = htRes.hit ? htRes.point : null;
  const vt = vtRes.hit ? vtRes.point : null;

  return {
    status: inconsistencies.length > 0 ? 'inconsistent' : 'fully_determined',
    message:
      inconsistencies.length > 0
        ? inconsistencies[0]
        : `TL=${trueLength.toFixed(1)}, θ=${theta.toFixed(1)}°, φ=${phi.toFixed(1)}°, FV=${fvLength.toFixed(1)} (α=${alpha.toFixed(1)}°), TV=${tvLength.toFixed(1)} (β=${beta.toFixed(1)}°).`,
    missingParams: [],
    inconsistencies,
    alternatives: [],
    selectedAlternativeIndex: 0,
    calculated: {
      trueLength,
      theta,
      phi,
      fvLength,
      tvLength,
      svLength,
      alpha,
      beta,
      projectorDist,
      p1,
      p2,
      ht,
      vt,
    },
    resolvedLine: {
      p1,
      p2,
      trueLength,
      theta,
      phi,
      fvLength,
      tvLength,
      svLength,
      alpha,
      beta,
      projectorDist,
      ht,
      vt,
    },
  };
}

/**
 * Complete N.D. Bhatt Ch. 12 Plane / Lamina Solver (v4):
 * - B1a: Solved normal matches buildPlaneStageMesh normal identically (|dot| = 1)
 * - B1b: Enforces cos²θ + cos²φ ≤ 1 (θ + φ ≥ 90°) when both surface inclinations are given
 * - B3a: Reports underdetermined when required shape dimensions are omitted
 */
export function solvePlane(pl: PlaneParams): SolverResult {
  const inconsistencies: string[] = [];
  const missing: Array<{ name: string; reason: string }> = [];

  // B3a: Check required dimensions per shape
  const needsRadius = pl.shape === 'circle' || pl.shape === 'semicircle' || pl.shape === 'circular_plate_hole';
  const needsLength =
    pl.shape === 'rectangle' ||
    pl.shape === 'rhombus' ||
    pl.shape === 'trapezium' ||
    pl.shape === 'triangle' ||
    pl.shape === 'isosceles_triangle' ||
    pl.shape === 'right_triangle' ||
    pl.shape === 'composite_rect_semicircle';

  if (needsRadius) {
    if (!isNum(pl.radius)) missing.push({ name: 'Radius', reason: `Required to define ${pl.shape.replace(/_/g, ' ')}.` });
  } else if (pl.shape === 'polygon') {
    if (!isNum(pl.radius) && (!pl.customVertices || pl.customVertices.length < 3)) {
      missing.push({ name: 'Radius or Custom Vertices', reason: 'Required to define custom polygon.' });
    }
  } else {
    if (!isNum(pl.width)) missing.push({ name: 'Width / Side', reason: `Required to define ${pl.shape.replace(/_/g, ' ')}.` });
    if (needsLength && !isNum(pl.length)) {
      missing.push({ name: 'Length / Height / D2', reason: `Required to define ${pl.shape.replace(/_/g, ' ')}.` });
    }
  }

  if (missing.length > 0) {
    return {
      status: 'underdetermined',
      message: `Missing ${missing.map((m) => m.name).join(', ')}.`,
      missingParams: missing,
      inconsistencies: [],
      alternatives: [],
      selectedAlternativeIndex: 0,
      calculated: {},
    };
  }

  let theta = isNum(pl.theta) ? pl.theta : 0;
  let phi = isNum(pl.phi) ? pl.phi : 0;
  const stage3Angle = isNum(pl.stage3Angle) ? pl.stage3Angle : 0;
  const restingOn = pl.restingOn ?? 'hp_edge';
  const restOnVP = restingOn === 'vp_edge' || restingOn === 'vp_corner' || restingOn === 'vp_diameter';
  const isEdgeRest = restingOn === 'hp_edge' || restingOn === 'vp_edge';
  const isCornerOrDiag =
    restingOn === 'hp_corner' ||
    restingOn === 'vp_corner' ||
    restingOn === 'hp_diameter' ||
    restingOn === 'vp_diameter' ||
    pl.stage3Ref === 'diagonal_or_median';

  const w = pl.width ?? 50;
  const l = pl.length ?? 30;
  const r = pl.radius ?? 25;
  const holeR = isNum(pl.holeRadius) ? pl.holeRadius : r * 0.4;
  const sides = isNum(pl.sides) ? Math.max(3, Math.round(pl.sides)) : 6;

  // Auto-solve inclination from apparent foreshortened width
  if (
    (pl.shape === 'rectangle' || pl.shape === 'rhombus' || pl.shape === 'circle') &&
    isNum(pl.apparentSquareSide) &&
    pl.apparentSquareSide > 0
  ) {
    const baseSpan = pl.shape === 'circle' ? 2 * r : Math.max(w, l);
    const ratio = pl.apparentSquareSide / baseSpan;
    if (ratio > 1 + TOL) {
      inconsistencies.push(`Apparent width (${pl.apparentSquareSide}) cannot exceed true dimension (${baseSpan}).`);
    } else {
      const solvedAng = radToDeg(Math.acos(Math.min(1, ratio)));
      if (restOnVP) phi = solvedAng;
      else theta = solvedAng;
    }
  }

  if (theta < 0 || theta > 90 || phi < 0 || phi > 90) {
    inconsistencies.push('Surface inclinations θ and φ must be between 0° and 90°.');
  }
  // B1b: For a plane inclined to BOTH HP and VP, cos²θ + cos²φ ≤ 1 <=> θ + φ ≥ 90°!
  if (isNum(pl.theta) && isNum(pl.phi) && pl.theta > TOL && pl.phi > TOL) {
    const cosSqSum = Math.cos(degToRad(pl.theta)) ** 2 + Math.cos(degToRad(pl.phi)) ** 2;
    if (cosSqSum > 1 + 1e-4) {
      inconsistencies.push(
        `Invalid plane surface inclinations: θ (${pl.theta}°) + φ (${pl.phi}°) = ${(pl.theta + pl.phi).toFixed(1)}° < 90° (violates cos²θ + cos²φ ≤ 1).`
      );
    }
  }
  if (stage3Angle < 0 || stage3Angle > 90) {
    inconsistencies.push('Stage 3 angle must be between 0° and 90°.');
  }

  const primaryAngle = restOnVP ? phi : theta;
  let apparentStage3Angle = stage3Angle;
  let usedLocus = false;

  if (isCornerOrDiag && pl.stage3IsApparent === false && primaryAngle > 0.1 && stage3Angle > 0.1) {
    if (primaryAngle + stage3Angle > 90 + 0.05) {
      inconsistencies.push(
        `Invalid true inclinations: primary (${primaryAngle.toFixed(1)}°) + Stage 3 true angle (${stage3Angle.toFixed(1)}°) > 90°.`
      );
    } else {
      const cosP = Math.cos(degToRad(primaryAngle));
      const sinS = Math.sin(degToRad(stage3Angle));
      apparentStage3Angle = cosP > EPS ? radToDeg(Math.asin(Math.min(1, sinS / cosP))) : 90;
      usedLocus = true;
    }
  }

  let area = 0;
  let perimeter = 0;
  switch (pl.shape) {
    case 'square':
      area = w * w;
      perimeter = 4 * w;
      break;
    case 'rectangle':
      area = w * l;
      perimeter = 2 * (w + l);
      break;
    case 'trapezium': {
      const topW = w * 0.6;
      area = 0.5 * (w + topW) * l;
      perimeter = w + topW + 2 * Math.hypot((w - topW) / 2, l);
      break;
    }
    case 'composite_rect_semicircle':
      area = w * l + 0.5 * Math.PI * (l / 2) ** 2;
      perimeter = 2 * w + l + Math.PI * (l / 2);
      break;
    case 'rhombus':
      area = 0.5 * w * l;
      perimeter = 4 * Math.hypot(w / 2, l / 2);
      break;
    case 'equilateral_triangle':
      area = (Math.sqrt(3) / 4) * w * w;
      perimeter = 3 * w;
      break;
    case 'isosceles_triangle':
    case 'triangle':
      area = 0.5 * w * l;
      perimeter = w + 2 * Math.hypot(w / 2, l);
      break;
    case 'right_triangle':
      area = 0.5 * w * l;
      perimeter = w + l + Math.hypot(w, l);
      break;
    case 'set_square_30_60': {
      const a = w / 2;
      const b = (w * Math.sqrt(3)) / 2;
      area = 0.5 * a * b;
      perimeter = w + a + b;
      break;
    }
    case 'set_square_45': {
      const leg = w / Math.SQRT2;
      area = 0.5 * leg * leg;
      perimeter = w + 2 * leg;
      break;
    }
    case 'semicircle':
      area = 0.5 * Math.PI * r * r;
      perimeter = Math.PI * r + 2 * r;
      break;
    case 'circle':
      area = Math.PI * r * r;
      perimeter = 2 * Math.PI * r;
      break;
    case 'circular_plate_hole':
      area = Math.PI * Math.max(0, r * r - holeR * holeR);
      perimeter = 2 * Math.PI * (r + holeR);
      break;
    case 'regular_pentagon': {
      const rad = w / (2 * Math.sin(Math.PI / 5));
      area = 0.5 * 5 * rad * rad * Math.sin((2 * Math.PI) / 5);
      perimeter = 5 * w;
      break;
    }
    case 'regular_hexagon':
      area = ((3 * Math.sqrt(3)) / 2) * w * w;
      perimeter = 6 * w;
      break;
    case 'polygon':
      area = 0.5 * sides * r * r * Math.sin((2 * Math.PI) / sides);
      perimeter = 2 * sides * r * Math.sin(Math.PI / sides);
      break;
  }

  // B1a: Exact same s3Rot & rotation matrix as buildPlaneStageMesh!
  const s3Rot =
    Math.abs(apparentStage3Angle) > 0.05
      ? isEdgeRest && pl.stage3Ref !== 'diagonal_or_median'
        ? 90 - apparentStage3Angle
        : apparentStage3Angle
      : 0;

  const center = vec3(pl.centerX ?? 55, pl.centerY ?? 40, restOnVP ? (pl.centerZ ?? 35) : 0);
  const rotMat = restOnVP
    ? mat4Multiply(mat4RotationY(-s3Rot), mat4RotationZ(phi))
    : mat4Multiply(mat4RotationZ(s3Rot), mat4RotationY(-theta));
  const normal = normalize(transformDirection(rotMat, restOnVP ? vec3(0, 1, 0) : vec3(0, 0, 1)));

  if (inconsistencies.length > 0) {
    return {
      status: 'inconsistent',
      message: inconsistencies[0],
      missingParams: [],
      inconsistencies,
      alternatives: [],
      selectedAlternativeIndex: 0,
      calculated: { area, perimeter },
    };
  }

  return {
    status: 'fully_determined',
    message: `${pl.shape.replace(/_/g, ' ')}: Area=${area.toFixed(1)}, ${restOnVP ? `φ=${phi.toFixed(1)}°` : `θ=${theta.toFixed(1)}°`}${stage3Angle > 0 ? `, Stage3=${stage3Angle.toFixed(1)}°${usedLocus ? ` (Apparent ${apparentStage3Angle.toFixed(1)}°)` : ''}` : ''}.`,
    missingParams: [],
    inconsistencies: [],
    alternatives: [],
    selectedAlternativeIndex: 0,
    calculated: {
      area,
      perimeter,
      theta,
      phi,
      stage3Angle,
      apparentStage3Angle,
      normal,
    },
    resolvedPlane: {
      center,
      area,
      perimeter,
      normal,
      theta,
      phi,
      stage3Angle,
      apparentStage3Angle,
      usedLocus,
      fvWidth: w * Math.cos(degToRad(phi)),
      tvHeight: l * Math.cos(degToRad(theta)),
    },
  };
}

/**
 * Complete N.D. Bhatt Ch. 13 Solid Solver (v4):
 * - B1c: Solved VP-resting axis matches buildSolidStageMesh axis identically
 * - B2: hp_longer_edge honors entered theta (e.g. 45° for W13-25 / E13b.7)
 * - B3b: Strict underdetermined detection when required dimensions are omitted
 * - B7: Allows Stage 3 rotation on vp_base / hp_base (e.g. W13-8)
 */
export function solveSolid(s: SolidParams): SolverResult {
  const inconsistencies: string[] = [];
  const missing: Array<{ name: string; reason: string }> = [];

  // B3b: Validate required dimensions per solid type
  const isRadiusSolid =
    s.solidType === 'cylinder' ||
    s.solidType === 'hollow_cylinder' ||
    s.solidType === 'cone' ||
    s.solidType === 'frustum_cone' ||
    s.solidType === 'sphere' ||
    s.solidType === 'hemisphere';
  const isSingleDimSolid =
    s.solidType === 'cube' || s.solidType === 'tetrahedron' || s.solidType === 'octahedron';
  const isSphereLike = s.solidType === 'sphere' || s.solidType === 'hemisphere';

  if (isRadiusSolid) {
    if (!isNum(s.radius)) missing.push({ name: 'Base Radius (R)', reason: `Required to define ${s.solidType.replace(/_/g, ' ')}.` });
    if (!isSphereLike && !isNum(s.height)) missing.push({ name: 'Axis Height (h)', reason: `Required to define ${s.solidType.replace(/_/g, ' ')}.` });
  } else if (isSingleDimSolid) {
    if (!isNum(s.width)) missing.push({ name: 'Edge Length (w)', reason: `Required to define ${s.solidType}.` });
  } else if (s.solidType === 'cuboid') {
    if (!isNum(s.width)) missing.push({ name: 'Width (w)', reason: 'Required to define cuboid.' });
    if (!isNum(s.height)) missing.push({ name: 'Height (h)', reason: 'Required to define cuboid.' });
  } else {
    if (!isNum(s.width) && !isNum(s.radius)) {
      missing.push({ name: 'Base Edge (w)', reason: `Required to define ${s.solidType.replace(/_/g, ' ')}.` });
    }
    if (!isNum(s.height)) {
      missing.push({ name: 'Axis Height (h)', reason: `Required to define ${s.solidType.replace(/_/g, ' ')}.` });
    }
  }

  if (missing.length > 0) {
    return {
      status: 'underdetermined',
      message: `Missing ${missing.map((m) => m.name).join(', ')}.`,
      missingParams: missing,
      inconsistencies: [],
      alternatives: [],
      selectedAlternativeIndex: 0,
      calculated: {},
    };
  }

  const restingOn = s.restingOn ?? 'hp_base';
  const restOnVP = restingOn.startsWith('vp_');

  const w = s.width ?? 35;
  const l = isNum(s.length) ? s.length : w;
  const h = getSolidEffectiveHeight(s);
  const r = s.radius ?? 25;
  const rIn = isNum(s.innerRadius) ? Math.min(r * 0.9, Math.max(1, s.innerRadius)) : r * 0.55;
  const rTop = isNum(s.topRadius) ? s.topRadius : Math.min(w, r) * 0.45;
  const sides = getSolidSideCount(s);
  const baseR = getSolidBaseRadius(s);
  const apothem = getSolidApothem(s);

  const isPyramidLike =
    s.solidType.includes('pyramid') || s.solidType === 'cone' || s.solidType === 'tetrahedron';

  let theta = isNum(s.theta) ? s.theta : 90;
  let phi = isNum(s.phi) ? s.phi : 0;
  let stage2TiltDeg = 90 - theta;

  switch (restingOn) {
    case 'hp_base':
      theta = 90;
      phi = 0;
      stage2TiltDeg = 0;
      break;
    case 'vp_base':
      theta = 0;
      phi = 90;
      stage2TiltDeg = 0;
      break;
    case 'axis_parallel_both':
    case 'hp_rect_face':
      theta = 0;
      stage2TiltDeg = 90;
      break;
    case 'hp_longer_edge':
      // B2: Honor entered theta (e.g. 45° for W13-25 / E13b.7) instead of hardwiring 0°!
      theta = isNum(s.theta) ? s.theta : 0;
      stage2TiltDeg = 90 - theta;
      break;
    case 'hp_base_edge':
    case 'hp_base_corner':
      theta = isNum(s.theta) ? s.theta : 45;
      stage2TiltDeg = 90 - theta;
      break;
    case 'hp_slant_face': {
      const gamma = radToDeg(Math.atan2(apothem, h));
      theta = gamma;
      stage2TiltDeg = 90 + gamma;
      break;
    }
    case 'hp_slant_edge': {
      const gamma = radToDeg(Math.atan2(baseR, h));
      theta = gamma;
      stage2TiltDeg = 90 + gamma;
      break;
    }
    case 'hp_generator': {
      if (s.solidType === 'cone') {
        const gamma = radToDeg(Math.atan2(r, h));
        theta = gamma;
        stage2TiltDeg = 90 + gamma;
      } else {
        const dr = s.solidType === 'frustum_cone' ? r - rTop : 0;
        const gamma = radToDeg(Math.atan2(dr, h));
        theta = gamma;
        stage2TiltDeg = 90 + gamma;
      }
      break;
    }
    case 'hp_freely_suspended': {
      const hCG = isPyramidLike ? h / 4 : h / 2;
      const betaSusp = radToDeg(Math.atan2(hCG, baseR));
      theta = betaSusp;
      stage2TiltDeg = -(90 + betaSusp);
      break;
    }
    case 'cube_solid_diagonal_vertical': {
      const tilt = radToDeg(Math.atan(Math.SQRT2));
      theta = 90 - tilt;
      stage2TiltDeg = -tilt;
      break;
    }
    case 'vp_base_edge':
    case 'vp_base_corner':
      phi = isNum(s.phi) ? s.phi : 45;
      stage2TiltDeg = 90 - phi;
      break;
    case 'vp_slant_face': {
      const gamma = radToDeg(Math.atan2(apothem, h));
      phi = gamma;
      stage2TiltDeg = 90 + gamma;
      break;
    }
    case 'vp_slant_edge': {
      const gamma = radToDeg(Math.atan2(baseR, h));
      phi = gamma;
      stage2TiltDeg = 90 + gamma;
      break;
    }
    case 'vp_generator': {
      const dr = s.solidType === 'cone' ? r : s.solidType === 'frustum_cone' ? r - rTop : 0;
      const gamma = radToDeg(Math.atan2(dr, h));
      phi = gamma;
      stage2TiltDeg = 90 + gamma;
      break;
    }
  }

  if (theta < 0 || theta > 90 || phi < 0 || phi > 90) {
    inconsistencies.push('Axis inclinations θ and φ must be between 0° and 90°.');
  }

  const stage3In = isNum(s.stage3Angle) ? s.stage3Angle : 0;
  const stage3Ref = s.stage3Ref ?? 'axis';
  let apparentStage3Angle = stage3In;
  let usedLocus = false;

  if (stage3In < 0 || stage3In > 90) {
    inconsistencies.push('Stage 3 angle must be between 0° and 90°.');
  }

  const primaryAxisAng = restOnVP ? phi : theta;
  if (stage3In > 0.1) {
    if (Math.abs(stage2TiltDeg) > 0.1) {
      if (stage3Ref === 'axis' && s.stage3IsApparent === false) {
        if (primaryAxisAng + stage3In > 90 + 0.05) {
          inconsistencies.push(
            `Impossible axis inclinations: primary (${primaryAxisAng.toFixed(1)}°) + true Stage 3 (${stage3In.toFixed(1)}°) > 90°.`
          );
        } else {
          const cosPrimary = Math.cos(degToRad(primaryAxisAng));
          const sinSecond = Math.sin(degToRad(stage3In));
          apparentStage3Angle = cosPrimary > EPS ? radToDeg(Math.asin(Math.min(1, sinSecond / cosPrimary))) : 90;
          usedLocus = true;
          if (restOnVP) theta = stage3In;
          else phi = stage3In;
        }
      } else if (stage3Ref === 'resting_edge') {
        apparentStage3Angle = 90 - stage3In;
      } else {
        apparentStage3Angle = stage3In;
        const derivedTrue = radToDeg(
          Math.asin(Math.min(1, Math.cos(degToRad(primaryAxisAng)) * Math.sin(degToRad(stage3In))))
        );
        if (restOnVP) theta = derivedTrue;
        else phi = derivedTrue;
      }
    } else {
      // B7: Base resting flat on HP or VP with base-edge rotated by stage3In (e.g. W13-8!)
      apparentStage3Angle = stage3In;
    }
  }

  const apexSign = s.apexOrientation === 'towards_vp' ? -1 : 1;
  const stage3RotationDeg = stage3In > 0.1 ? apexSign * apparentStage3Angle : 0;

  // Volume & Surface Area
  let volume = 0;
  let surfaceArea = 0;
  const polyArea = (n: number, side: number) => (n * side * side) / (4 * Math.tan(Math.PI / n));

  switch (s.solidType) {
    case 'tetrahedron':
      volume = (w * w * w) / (6 * Math.SQRT2);
      surfaceArea = Math.sqrt(3) * w * w;
      break;
    case 'cube':
      volume = w * w * w;
      surfaceArea = 6 * w * w;
      break;
    case 'cuboid':
      volume = w * l * h;
      surfaceArea = 2 * (w * l + l * h + h * w);
      break;
    case 'octahedron':
      volume = (Math.SQRT2 / 3) * w * w * w;
      surfaceArea = 2 * Math.sqrt(3) * w * w;
      break;
    case 'triangular_prism':
    case 'square_prism':
    case 'pentagonal_prism':
    case 'hexagonal_prism': {
      const ba = polyArea(sides, w);
      volume = ba * h;
      surfaceArea = 2 * ba + sides * w * h;
      break;
    }
    case 'prism': {
      const ba = 0.5 * sides * baseR * baseR * Math.sin((2 * Math.PI) / sides);
      volume = ba * h;
      surfaceArea = 2 * ba + sides * (2 * baseR * Math.sin(Math.PI / sides)) * h;
      break;
    }
    case 'hollow_prism': {
      const baOut = 0.5 * sides * baseR * baseR * Math.sin((2 * Math.PI) / sides);
      const baIn = 0.5 * sides * rIn * rIn * Math.sin((2 * Math.PI) / sides);
      volume = Math.max(0, baOut - baIn) * h;
      surfaceArea = 2 * Math.max(0, baOut - baIn) + sides * (2 * (baseR + rIn) * Math.sin(Math.PI / sides)) * h;
      break;
    }
    case 'triangular_pyramid':
    case 'square_pyramid':
    case 'pentagonal_pyramid':
    case 'hexagonal_pyramid': {
      const ba = polyArea(sides, w);
      volume = (1 / 3) * ba * h;
      surfaceArea = ba + 0.5 * sides * w * Math.hypot(h, apothem);
      break;
    }
    case 'pyramid': {
      const ba = 0.5 * sides * baseR * baseR * Math.sin((2 * Math.PI) / sides);
      volume = (1 / 3) * ba * h;
      surfaceArea = ba + 0.5 * sides * (2 * baseR * Math.sin(Math.PI / sides)) * Math.hypot(h, apothem);
      break;
    }
    case 'cylinder':
      volume = Math.PI * r * r * h;
      surfaceArea = 2 * Math.PI * r * (r + h);
      break;
    case 'hollow_cylinder':
      volume = Math.PI * Math.max(0, r * r - rIn * rIn) * h;
      surfaceArea = 2 * Math.PI * (r + rIn) * h + 2 * Math.PI * Math.max(0, r * r - rIn * rIn);
      break;
    case 'cone':
      volume = (1 / 3) * Math.PI * r * r * h;
      surfaceArea = Math.PI * r * (r + Math.hypot(r, h));
      break;
    case 'sphere':
      volume = (4 / 3) * Math.PI * r * r * r;
      surfaceArea = 4 * Math.PI * r * r;
      break;
    case 'hemisphere':
      volume = (2 / 3) * Math.PI * r * r * r;
      surfaceArea = 3 * Math.PI * r * r;
      break;
    case 'frustum_cone':
      volume = ((Math.PI * h) / 3) * (r * r + r * rTop + rTop * rTop);
      surfaceArea = Math.PI * (r * r + rTop * rTop + (r + rTop) * Math.hypot(r - rTop, h));
      break;
    case 'frustum_pyramid': {
      const a1 = 0.5 * sides * baseR * baseR * Math.sin((2 * Math.PI) / sides);
      const a2 = 0.5 * sides * rTop * rTop * Math.sin((2 * Math.PI) / sides);
      volume = (h / 3) * (a1 + a2 + Math.sqrt(a1 * a2));
      const p1 = sides * 2 * baseR * Math.sin(Math.PI / sides);
      const p2 = sides * 2 * rTop * Math.sin(Math.PI / sides);
      surfaceArea = a1 + a2 + 0.5 * (p1 + p2) * Math.hypot(h, (baseR - rTop) * Math.cos(Math.PI / sides));
      break;
    }
  }

  const center = vec3(s.centerX ?? 60, s.centerY ?? 45, s.centerZ ?? h / 2);
  const slantHeight = isPyramidLike ? Math.hypot(h, apothem) : undefined;
  const slantEdge = isPyramidLike ? Math.hypot(h, baseR) : undefined;
  const semiVerticalAngle = s.solidType === 'cone' ? radToDeg(Math.atan2(r, h)) : undefined;

  // B1c: Compute axisDir using the EXACT same matrix sequence as buildSolidStageMesh!
  let rotMat = mat4Identity();
  if (!restOnVP) {
    if (Math.abs(stage2TiltDeg) > 0.05) rotMat = mat4Multiply(mat4RotationY(stage2TiltDeg), rotMat);
    if (Math.abs(stage3RotationDeg) > 0.05) rotMat = mat4Multiply(mat4RotationZ(stage3RotationDeg), rotMat);
  } else {
    rotMat = mat4RotationX(-90);
    if (Math.abs(stage2TiltDeg) > 0.05) rotMat = mat4Multiply(mat4RotationZ(-stage2TiltDeg), rotMat);
    if (Math.abs(stage3RotationDeg) > 0.05) rotMat = mat4Multiply(mat4RotationY(stage3RotationDeg), rotMat);
  }
  const axisDir = normalize(transformDirection(rotMat, vec3(0, 0, 1)));
  const halfH = h / 2;
  const axisStart = { x: center.x - axisDir.x * halfH, y: center.y - axisDir.y * halfH, z: center.z - axisDir.z * halfH };
  const axisEnd = { x: center.x + axisDir.x * halfH, y: center.y + axisDir.y * halfH, z: center.z + axisDir.z * halfH };

  if (inconsistencies.length > 0) {
    return {
      status: 'inconsistent',
      message: inconsistencies[0],
      missingParams: [],
      inconsistencies,
      alternatives: [],
      selectedAlternativeIndex: 0,
      calculated: { volume, surfaceArea },
    };
  }

  return {
    status: 'fully_determined',
    message: `${s.solidType.replace(/_/g, ' ')} (${restingOn.replace(/_/g, ' ')}): Axis θ=${theta.toFixed(1)}°, φ=${phi.toFixed(1)}°${usedLocus ? ` [Locus β=${apparentStage3Angle.toFixed(1)}°]` : ''}.`,
    missingParams: [],
    inconsistencies: [],
    alternatives: [],
    selectedAlternativeIndex: 0,
    calculated: {
      volume,
      surfaceArea,
      theta,
      phi,
      stage3Angle: stage3In,
      apparentStage3Angle,
      ...(slantEdge ? { slantEdge } : {}),
      ...(slantHeight ? { slantHeight } : {}),
      ...(semiVerticalAngle ? { semiVerticalAngle } : {}),
    },
    resolvedSolid: {
      center,
      volume,
      surfaceArea,
      axisStart,
      axisEnd,
      effectiveTheta: theta,
      effectivePhi: phi,
      stage2TiltDeg,
      stage3RotationDeg,
      apparentStage3Angle,
      usedLocus,
      slantHeight,
      slantEdge,
      semiVerticalAngle,
    },
  };
}

export function solveCurve(c: CurveParams): SolverResult {
  const inconsistencies: string[] = [];
  const r = isNum(c.radius) ? c.radius : 30;
  const maj = isNum(c.majorRadius) ? c.majorRadius : 45;
  const min = isNum(c.minorRadius) ? c.minorRadius : 30;
  if (r <= 0 || maj <= 0 || min <= 0) inconsistencies.push('Radius / semi-axes must be positive.');

  let arcLength = 2 * Math.PI * r;
  if (c.curveType === 'arc') {
    arcLength = 2 * Math.PI * r * (Math.abs((c.endAngle ?? 180) - (c.startAngle ?? 0)) / 360);
  } else if (c.curveType === 'ellipse') {
    arcLength = Math.PI * (3 * (maj + min) - Math.sqrt((3 * maj + min) * (maj + 3 * min)));
  } else if (c.curveType === 'helix') {
    arcLength = (c.turns ?? 2) * Math.hypot(2 * Math.PI * r, c.pitch ?? 20);
  }

  return {
    status: inconsistencies.length > 0 ? 'inconsistent' : 'fully_determined',
    message: inconsistencies.length > 0 ? inconsistencies[0] : `${c.curveType} curve: Length ≈ ${arcLength.toFixed(2)}.`,
    missingParams: [],
    inconsistencies,
    alternatives: [],
    selectedAlternativeIndex: 0,
    calculated: { arcLength, radius: r },
  };
}

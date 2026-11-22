import {
  EngineeringObject,
  MeshData,
  PlaneParams,
  ProjectionSettings,
  SolidParams,
  SolverResult,
  Vec2,
  Vec3,
} from '../types/engineering';
import { buildPlaneStageMesh, buildSolidStageMesh } from '../geometry/builders';
import { projectMeshToView, projectPoint2D } from './projector';
import { degToRad } from '../engineering/units';
import { cross, distance, dot, lerp, normalize, sub, vec3 } from '../geometry/math';
import { getSolidBaseRadius, getSolidEffectiveHeight, getSolidSideCount } from '../solver/constraintSolver';

export type SheetLayer =
  | 'xy'
  | 'object'
  | 'hidden'
  | 'projector'
  | 'locus'
  | 'arc'
  | 'trueLength'
  | 'trace'
  | 'axis'
  | 'dimension'
  | 'label'
  | 'stageGuide'
  | 'section'
  | 'hatch'
  | 'development';

export interface SheetLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: SheetLayer;
}

export interface SheetArc {
  cx: number;
  cy: number;
  r: number;
  startAngleDeg: number;
  endAngleDeg: number;
  layer: SheetLayer;
}

export interface SheetPoint {
  x: number;
  y: number;
  label?: string;
  layer: SheetLayer;
}

export interface SheetText {
  x: number;
  y: number;
  text: string;
  layer: SheetLayer;
  size?: number;
}

export interface MultiStageSheetData {
  title: string;
  subtitle: string;
  stageCount: 1 | 2 | 3;
  lines: SheetLine[];
  arcs: SheetArc[];
  points: SheetPoint[];
  texts: SheetText[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

function emptyBounds() {
  return { minX: -20, maxX: 260, minY: -100, maxY: 100 };
}

function updateBounds(b: { minX: number; maxX: number; minY: number; maxY: number }, x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  if (x < b.minX) b.minX = x;
  if (x > b.maxX) b.maxX = x;
  if (y < b.minY) b.minY = y;
  if (y > b.maxY) b.maxY = y;
}

function makeSheetProjectionSettings(convention: 'first-angle' | 'third-angle'): ProjectionSettings {
  return {
    convention,
    scaleRatio: 1,
    scaleLabel: '1:1',
    showHP: true,
    showVP: true,
    showXY: true,
    showProjectors: false,
    showHiddenLines: true,
    showDimensions: false,
    showLabels: true,
    showTraces: false,
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
    hpOpacity: 0.2,
    vpOpacity: 0.2,
    hpColor: '#0ea5e9',
    vpColor: '#8b5cf6',
    cameraMode: 'perspective',
    sectionEnabled: false,
    sectionAxis: 'z',
    sectionOffset: 30,
    sectionAngle: 45,
    auxiliaryEnabled: false,
    auxiliaryAngle: 45,
    auxiliaryType: 'aip',
  };
}

export function buildMultiStageSheet(
  obj: EngineeringObject,
  solved: SolverResult,
  convention: 'first-angle' | 'third-angle' = 'first-angle'
): MultiStageSheetData {
  if (obj.params.category === 'line') {
    return buildLineSheet(obj, solved, convention);
  }
  if (obj.params.category === 'plane') {
    return buildPlaneMultiStageSheet(obj.params.data, obj.name, solved, convention);
  }
  if (obj.params.category === 'solid') {
    return buildSolidMultiStageSheet(obj.params.data, obj.name, solved, convention);
  }
  return buildPointSheet(obj, solved, convention);
}

function buildPointSheet(
  obj: EngineeringObject,
  solved: SolverResult,
  convention: 'first-angle' | 'third-angle'
): MultiStageSheetData {
  const p = solved.resolvedPoint ?? { x: 40, y: 25, z: 35 };
  const label = (obj.params.category === 'point' && obj.params.data.label) || 'P';
  const signY = convention === 'first-angle' ? -1 : 1;
  const fvY = p.z;
  const tvY = signY * p.y;

  const x1y1 = Math.max(90, p.x + 45);
  const svX = x1y1 + Math.abs(p.y);

  const lines: SheetLine[] = [
    { x1: -20, y1: 0, x2: svX + 40, y2: 0, layer: 'xy' },
    { x1: x1y1, y1: -Math.max(50, Math.abs(tvY) + 20), x2: x1y1, y2: Math.max(50, Math.abs(fvY) + 20), layer: 'xy' },
    { x1: p.x, y1: fvY, x2: p.x, y2: tvY, layer: 'projector' },
    { x1: p.x, y1: fvY, x2: svX, y2: fvY, layer: 'projector' },
    { x1: p.x, y1: tvY, x2: x1y1, y2: tvY, layer: 'projector' },
    { x1: svX, y1: 0, x2: svX, y2: fvY, layer: 'projector' },
  ];

  const arcs: SheetArc[] = [];
  if (Math.abs(p.y) > 0.5) {
    arcs.push({
      cx: x1y1,
      cy: 0,
      r: Math.abs(p.y),
      startAngleDeg: tvY < 0 ? -90 : 90,
      endAngleDeg: 0,
      layer: 'arc',
    });
  }

  const points: SheetPoint[] = [
    { x: p.x, y: fvY, label: `${label.toLowerCase()}'`, layer: 'object' },
    { x: p.x, y: tvY, label: label.toLowerCase(), layer: 'object' },
    { x: svX, y: fvY, label: `${label.toLowerCase()}''`, layer: 'object' },
  ];
  const texts: SheetText[] = [
    { x: -16, y: 4, text: 'X', layer: 'xy' },
    { x: svX + 34, y: 4, text: 'Y', layer: 'xy' },
    { x: x1y1 + 2, y: Math.max(46, Math.abs(fvY) + 16), text: 'X1', layer: 'xy', size: 3.6 },
    { x: x1y1 + 2, y: -Math.max(46, Math.abs(tvY) + 16), text: 'Y1', layer: 'xy', size: 3.6 },
    { x: p.x + 3, y: fvY / 2, text: `h=${Math.abs(p.z).toFixed(1)}`, layer: 'dimension', size: 3.6 },
    { x: p.x + 3, y: tvY / 2, text: `d=${Math.abs(p.y).toFixed(1)}`, layer: 'dimension', size: 3.6 },
  ];

  const bounds = emptyBounds();
  lines.forEach((l) => { updateBounds(bounds, l.x1, l.y1); updateBounds(bounds, l.x2, l.y2); });
  return {
    title: `Point ${label} — Orthographic Projection (FV, TV & SV)`,
    subtitle: `${convention === 'first-angle' ? '1st Angle' : '3rd Angle'} | Quadrant ${solved.calculated.quadrant ?? '—'}`,
    stageCount: 1,
    lines,
    arcs,
    points,
    texts,
    bounds,
  };
}

function buildLineSheet(
  obj: EngineeringObject,
  solved: SolverResult,
  convention: 'first-angle' | 'third-angle'
): MultiStageSheetData {
  const rl = solved.resolvedLine;
  const lines: SheetLine[] = [];
  const arcs: SheetArc[] = [];
  const points: SheetPoint[] = [];
  const texts: SheetText[] = [];
  const bounds = emptyBounds();

  if (!rl) {
    return {
      title: `${obj.name} — Incomplete Constraints`,
      subtitle: solved.message,
      stageCount: 1,
      lines: [{ x1: -20, y1: 0, x2: 180, y2: 0, layer: 'xy' }],
      arcs: [],
      points: [],
      texts: [{ x: 20, y: 20, text: solved.message, layer: 'label' }],
      bounds,
    };
  }

  const signY = convention === 'first-angle' ? -1 : 1;
  const aFx = rl.p1.x, aFy = rl.p1.z;
  const bFx = rl.p2.x, bFy = rl.p2.z;
  const aTx = rl.p1.x, aTy = signY * rl.p1.y;
  const bTx = rl.p2.x, bTy = signY * rl.p2.y;

  const L = rl.trueLength;
  const thetaRad = degToRad(rl.theta);
  const phiRad = degToRad(rl.phi);
  const dzSign = bFy >= aFy ? 1 : -1;
  const dySign = bTy >= aTy ? 1 : -1;
  const xDir = bFx >= aFx - 1e-4 ? 1 : -1;

  const b1Fx = aFx + xDir * L * Math.cos(thetaRad);
  const b1Fy = aFy + dzSign * L * Math.sin(thetaRad);
  const b1Tx = aTx + xDir * L * Math.cos(phiRad);
  const b1Ty = aTy + dySign * L * Math.sin(phiRad);

  const isProfile = Math.abs(rl.theta + rl.phi - 90) < 0.5 && Math.abs(bFx - aFx) < 0.5;
  const maxXBase = Math.max(aFx, bFx, b1Fx, b1Tx, aFx + L) + 35;
  const x1y1 = isProfile ? maxXBase + 10 : maxXBase;
  const maxX = isProfile ? x1y1 + Math.max(Math.abs(rl.p1.y), Math.abs(rl.p2.y)) + 45 : maxXBase;
  const minX = Math.min(aFx, bFx, b1Fx, b1Tx, rl.ht?.x ?? aFx, rl.vt?.x ?? aFx) - 35;

  lines.push({ x1: minX, y1: 0, x2: maxX, y2: 0, layer: 'xy' });
  texts.push({ x: minX + 2, y: 4, text: 'X', layer: 'xy' });
  texts.push({ x: maxX - 8, y: 4, text: 'Y', layer: 'xy' });

  lines.push({ x1: aFx, y1: aFy, x2: aTx, y2: aTy, layer: 'projector' });
  lines.push({ x1: bFx, y1: bFy, x2: bTx, y2: bTy, layer: 'projector' });

  lines.push({ x1: aFx, y1: aFy, x2: maxXBase - 8, y2: aFy, layer: 'locus' });
  lines.push({ x1: aTx, y1: aTy, x2: maxXBase - 8, y2: aTy, layer: 'locus' });

  lines.push({ x1: Math.min(aFx, bFx) - 5, y1: bFy, x2: maxXBase - 5, y2: bFy, layer: 'locus' });
  lines.push({ x1: Math.min(aTx, bTx) - 5, y1: bTy, x2: maxXBase - 5, y2: bTy, layer: 'locus' });
  texts.push({ x: maxXBase - 26, y: bFy + (dzSign >= 0 ? 4 : -6), text: "Locus of b'", layer: 'locus', size: 3.4 });
  texts.push({ x: maxXBase - 26, y: bTy + (dySign >= 0 ? 4 : -6), text: 'Locus of b', layer: 'locus', size: 3.4 });

  lines.push({ x1: aFx, y1: aFy, x2: b1Fx, y2: b1Fy, layer: 'trueLength' });
  lines.push({ x1: aTx, y1: aTy, x2: b1Tx, y2: b1Ty, layer: 'trueLength' });

  lines.push({ x1: b1Fx, y1: b1Fy, x2: b1Fx, y2: aTy, layer: 'projector' });
  lines.push({ x1: b1Tx, y1: b1Ty, x2: b1Tx, y2: aFy, layer: 'projector' });

  const rTV = Math.hypot(bTx - aTx, bTy - aTy);
  const rFV = Math.hypot(bFx - aFx, bFy - aFy);
  const baseAng = xDir >= 0 ? 0 : 180;
  if (rTV > 0.5) {
    const endAngTV = (Math.atan2(bTy - aTy, bTx - aTx) * 180) / Math.PI;
    arcs.push({ cx: aTx, cy: aTy, r: rTV, startAngleDeg: baseAng, endAngleDeg: endAngTV, layer: 'arc' });
  }
  if (rFV > 0.5) {
    const endAngFV = (Math.atan2(bFy - aFy, bFx - aFx) * 180) / Math.PI;
    arcs.push({ cx: aFx, cy: aFy, r: rFV, startAngleDeg: baseAng, endAngleDeg: endAngFV, layer: 'arc' });
  }

  lines.push({ x1: aFx, y1: aFy, x2: bFx, y2: bFy, layer: 'object' });
  lines.push({ x1: aTx, y1: aTy, x2: bTx, y2: bTy, layer: 'object' });

  if (isProfile) {
    const svAx = x1y1 + rl.p1.y;
    const svBx = x1y1 + rl.p2.y;
    lines.push({ x1: x1y1, y1: Math.min(aTy, bTy) - 15, x2: x1y1, y2: Math.max(aFy, bFy) + 15, layer: 'xy' });
    lines.push({ x1: svAx, y1: aFy, x2: svBx, y2: bFy, layer: 'object' });
    lines.push({ x1: aFx, y1: aFy, x2: svAx, y2: aFy, layer: 'projector' });
    lines.push({ x1: bFx, y1: bFy, x2: svBx, y2: bFy, layer: 'projector' });
    points.push(
      { x: svAx, y: aFy, label: "a''", layer: 'object' },
      { x: svBx, y: bFy, label: "b''", layer: 'object' }
    );
    texts.push({ x: x1y1 + 4, y: Math.max(aFy, bFy) + 12, text: 'SIDE VIEW (True Length)', layer: 'stageGuide', size: 3.6 });
  }

  if (rl.ht) {
    const hx = rl.ht.x;
    const htY = signY * rl.ht.y;
    const nearFx = Math.abs(hx - aFx) < Math.abs(hx - bFx) ? aFx : bFx;
    const nearFy = Math.abs(hx - aFx) < Math.abs(hx - bFx) ? aFy : bFy;
    const nearTx = Math.abs(hx - aTx) < Math.abs(hx - bTx) ? aTx : bTx;
    const nearTy = Math.abs(hx - aTx) < Math.abs(hx - bTx) ? aTy : bTy;
    lines.push({ x1: nearFx, y1: nearFy, x2: hx, y2: 0, layer: 'trace' });
    lines.push({ x1: hx, y1: 0, x2: hx, y2: htY, layer: 'trace' });
    lines.push({ x1: nearTx, y1: nearTy, x2: hx, y2: htY, layer: 'trace' });
    points.push({ x: hx, y: 0, label: 'h', layer: 'trace' });
    points.push({ x: hx, y: htY, label: 'H.T.', layer: 'trace' });
  }
  if (rl.vt) {
    const vx = rl.vt.x;
    const vtY = rl.vt.z;
    const nearTx = Math.abs(vx - aTx) < Math.abs(vx - bTx) ? aTx : bTx;
    const nearTy = Math.abs(vx - aTx) < Math.abs(vx - bTx) ? aTy : bTy;
    const nearFx = Math.abs(vx - aFx) < Math.abs(vx - bFx) ? aFx : bFx;
    const nearFy = Math.abs(vx - aFx) < Math.abs(vx - bFx) ? aFy : bFy;
    lines.push({ x1: nearTx, y1: nearTy, x2: vx, y2: 0, layer: 'trace' });
    lines.push({ x1: vx, y1: 0, x2: vx, y2: vtY, layer: 'trace' });
    lines.push({ x1: nearFx, y1: nearFy, x2: vx, y2: vtY, layer: 'trace' });
    points.push({ x: vx, y: 0, label: 'v', layer: 'trace' });
    points.push({ x: vx, y: vtY, label: 'V.T.', layer: 'trace' });
  }

  const l1 = (obj.params.category === 'line' && obj.params.data.labelStart) || 'A';
  const l2 = (obj.params.category === 'line' && obj.params.data.labelEnd) || 'B';
  points.push(
    { x: aFx, y: aFy, label: `${l1.toLowerCase()}'`, layer: 'object' },
    { x: bFx, y: bFy, label: `${l2.toLowerCase()}'`, layer: 'object' },
    { x: aTx, y: aTy, label: l1.toLowerCase(), layer: 'object' },
    { x: bTx, y: bTy, label: l2.toLowerCase(), layer: 'object' },
    { x: b1Fx, y: b1Fy, label: `${l2.toLowerCase()}1'`, layer: 'trueLength' },
    { x: b1Tx, y: b1Ty, label: `${l2.toLowerCase()}1`, layer: 'trueLength' }
  );

  texts.push(
    { x: (aFx + b1Fx) / 2 + 2, y: (aFy + b1Fy) / 2 + (dzSign >= 0 ? 4 : -6), text: `TL=${L.toFixed(1)} (θ=${rl.theta.toFixed(1)}°)`, layer: 'dimension', size: 3.4 },
    { x: (aTx + b1Tx) / 2 + 2, y: (aTy + b1Ty) / 2 + (dySign >= 0 ? 4 : -6), text: `TL=${L.toFixed(1)} (φ=${rl.phi.toFixed(1)}°)`, layer: 'dimension', size: 3.4 },
    { x: (aFx + bFx) / 2 - 14, y: (aFy + bFy) / 2 + 6, text: `FV=${rl.fvLength.toFixed(1)} (α=${rl.alpha.toFixed(1)}°)`, layer: 'dimension', size: 3.4 },
    { x: (aTx + bTx) / 2 - 14, y: (aTy + bTy) / 2 - 6, text: `TV=${rl.tvLength.toFixed(1)} (β=${rl.beta.toFixed(1)}°)`, layer: 'dimension', size: 3.4 }
  );

  lines.forEach((l) => { updateBounds(bounds, l.x1, l.y1); updateBounds(bounds, l.x2, l.y2); });
  points.forEach((pt) => updateBounds(bounds, pt.x, pt.y));

  return {
    title: `Straight Line ${l1}${l2} — Locus & Rotation Construction`,
    subtitle: `TL=${L.toFixed(1)} | θ=${rl.theta.toFixed(1)}° | φ=${rl.phi.toFixed(1)}° | α=${rl.alpha.toFixed(1)}° | β=${rl.beta.toFixed(1)}°`,
    stageCount: 2,
    lines,
    arcs,
    points,
    texts,
    bounds,
  };
}

function addProjectedStageToSheet(
  mesh: MeshData,
  shiftX: number,
  stageLabel: string,
  pointSuffix: string,
  settings: ProjectionSettings,
  lines: SheetLine[],
  points: SheetPoint[],
  texts: SheetText[]
): { fvPts: Vec2[]; tvPts: Vec2[]; maxX: number; maxY: number } {
  const fv = projectMeshToView(mesh, 'front', settings);
  const tv = projectMeshToView(mesh, 'top', settings);

  let maxX = shiftX;
  let maxY = 20;

  const pushEdges = (edges: typeof fv.edges) => {
    for (const e of edges) {
      const layer: SheetLayer =
        e.kind === 'hidden'
          ? 'hidden'
          : e.kind === 'axis'
          ? 'axis'
          : e.kind === 'section'
          ? 'section'
          : 'object';
      const x1 = e.start.u + shiftX;
      const x2 = e.end.u + shiftX;
      lines.push({ x1, y1: e.start.v, x2, y2: e.end.v, layer });
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, e.start.v, e.end.v);
    }
  };

  pushEdges(fv.edges);
  pushEdges(tv.edges);

  const fvPts: Vec2[] = [];
  const tvPts: Vec2[] = [];

  for (let i = 0; i < mesh.points.length; i++) {
    const pt = mesh.points[i];
    const fp = projectPoint2D(pt.position, 'front', settings);
    const tp = projectPoint2D(pt.position, 'top', settings);
    const fShifted = { u: fp.u + shiftX, v: fp.v };
    const tShifted = { u: tp.u + shiftX, v: tp.v };
    fvPts.push(fShifted);
    tvPts.push(tShifted);

    lines.push({ x1: fShifted.u, y1: fShifted.v, x2: tShifted.u, y2: tShifted.v, layer: 'projector' });

    if (mesh.points.length <= 12) {
      const baseName = pt.label.toLowerCase();
      points.push({ x: fShifted.u, y: fShifted.v, label: `${baseName}${pointSuffix}'`, layer: 'object' });
      points.push({ x: tShifted.u, y: tShifted.v, label: `${baseName}${pointSuffix}`, layer: 'object' });
    }
    maxX = Math.max(maxX, fShifted.u);
    maxY = Math.max(maxY, fShifted.v);
  }

  const minStageX = mesh.boundingBox.min.x + shiftX;
  texts.push({ x: minStageX, y: maxY + 12, text: stageLabel, layer: 'stageGuide', size: 4.0 });

  return { fvPts, tvPts, maxX, maxY };
}

function buildPlaneMultiStageSheet(
  pl: PlaneParams,
  name: string,
  solved: SolverResult,
  convention: 'first-angle' | 'third-angle'
): MultiStageSheetData {
  const lines: SheetLine[] = [];
  const arcs: SheetArc[] = [];
  const points: SheetPoint[] = [];
  const texts: SheetText[] = [];
  const bounds = emptyBounds();
  const settings = makeSheetProjectionSettings(convention);

  const restOnVP = pl.restingOn === 'vp_edge' || pl.restingOn === 'vp_corner' || pl.restingOn === 'vp_diameter';
  const primaryAngle = restOnVP
    ? (solved.resolvedPlane?.phi ?? pl.phi ?? 0)
    : (solved.resolvedPlane?.theta ?? pl.theta ?? 0);
  const stage3Ang = solved.resolvedPlane?.stage3Angle ?? pl.stage3Angle ?? 0;
  const appS3 = solved.resolvedPlane?.apparentStage3Angle ?? stage3Ang;
  const usedLocus = Boolean(solved.resolvedPlane?.usedLocus);

  const hasStage2 = primaryAngle > 0.1;
  const hasStage3 = hasStage2 && Math.abs(stage3Ang) > 0.1;
  const stageCount: 1 | 2 | 3 = hasStage3 ? 3 : hasStage2 ? 2 : 1;

  const m1 = buildPlaneStageMesh(pl, name, solved, 1);
  const s1Shift = 20 - m1.boundingBox.min.x;
  const s1 = addProjectedStageToSheet(m1, s1Shift, 'STAGE 1 (True Shape)', '', settings, lines, points, texts);
  let cursorX = s1.maxX + 42;

  let s2: ReturnType<typeof addProjectedStageToSheet> | null = null;
  if (hasStage2) {
    const m2 = buildPlaneStageMesh(pl, name, solved, 2);
    const s2Shift = cursorX - m2.boundingBox.min.x;
    s2 = addProjectedStageToSheet(
      m2,
      s2Shift,
      `STAGE 2 (${restOnVP ? 'φ' : 'θ'}=${primaryAngle.toFixed(1)}°)`,
      '1',
      settings,
      lines,
      points,
      texts
    );
    for (let i = 0; i < Math.min(s1.tvPts.length, s2.tvPts.length); i++) {
      if (!restOnVP) {
        lines.push({ x1: s1.tvPts[i].u, y1: s1.tvPts[i].v, x2: s2.tvPts[i].u, y2: s2.tvPts[i].v, layer: 'locus' });
      } else {
        lines.push({ x1: s1.fvPts[i].u, y1: s1.fvPts[i].v, x2: s2.fvPts[i].u, y2: s2.fvPts[i].v, layer: 'locus' });
      }
    }
    cursorX = s2.maxX + 48;
  }

  if (hasStage3 && s2) {
    const m3 = buildPlaneStageMesh(pl, name, solved, 3);
    const s3Shift = cursorX - m3.boundingBox.min.x;
    const s3Title = usedLocus
      ? `STAGE 3 (True ${stage3Ang.toFixed(1)}° → Apparent ${appS3.toFixed(1)}°)`
      : `STAGE 3 (Final @ ${stage3Ang.toFixed(1)}°)`;
    const s3 = addProjectedStageToSheet(m3, s3Shift, s3Title, '2', settings, lines, points, texts);
    for (let i = 0; i < Math.min(s2.fvPts.length, s3.fvPts.length); i++) {
      if (!restOnVP) {
        lines.push({ x1: s2.fvPts[i].u, y1: s2.fvPts[i].v, x2: s3.fvPts[i].u, y2: s3.fvPts[i].v, layer: 'locus' });
      } else {
        lines.push({ x1: s2.tvPts[i].u, y1: s2.tvPts[i].v, x2: s3.tvPts[i].u, y2: s3.tvPts[i].v, layer: 'locus' });
      }
    }
    cursorX = s3.maxX + 35;
  }

  lines.push({ x1: 0, y1: 0, x2: cursorX, y2: 0, layer: 'xy' });
  texts.push({ x: 2, y: 4, text: 'X', layer: 'xy' });
  texts.push({ x: cursorX - 8, y: 4, text: 'Y', layer: 'xy' });

  lines.forEach((l) => { updateBounds(bounds, l.x1, l.y1); updateBounds(bounds, l.x2, l.y2); });
  return {
    title: `${name} — ${stageCount}-Stage Change-of-Position Projection`,
    subtitle: `Resting: ${(pl.restingOn ?? 'hp_edge').replace(/_/g, ' ')} | ${restOnVP ? 'φ' : 'θ'}=${primaryAngle.toFixed(1)}°${hasStage3 ? ` | Stage 3=${stage3Ang.toFixed(1)}°${usedLocus ? ` (β=${appS3.toFixed(1)}°)` : ''}` : ''}`,
    stageCount,
    lines,
    arcs,
    points,
    texts,
    bounds,
  };
}

function computeSectionPolygon3D(mesh: MeshData): { pts3D: Vec3[]; pts2DLocal: Vec2[] } {
  if (!mesh.sectionPlane || mesh.faces.length === 0) return { pts3D: [], pts2DLocal: [] };
  const { point, normal } = mesh.sectionPlane;
  const signedDist = (v: Vec3) => dot(sub(v, point), normal);

  const rawHits: Vec3[] = [];
  for (const f of mesh.faces) {
    const verts = f.indices.map((i) => mesh.vertices[i]);
    for (let i = 0; i < 3; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % 3];
      const da = signedDist(a);
      const db = signedDist(b);
      if ((da > 1e-5 && db < -1e-5) || (da < -1e-5 && db > 1e-5)) {
        const hit = lerp(a, b, da / (da - db));
        if (!rawHits.some((p) => distance(p, hit) < 0.15)) {
          rawHits.push(hit);
        }
      }
    }
  }
  if (rawHits.length < 3) return { pts3D: [], pts2DLocal: [] };

  const centroid = vec3(
    rawHits.reduce((a, p) => a + p.x, 0) / rawHits.length,
    rawHits.reduce((a, p) => a + p.y, 0) / rawHits.length,
    rawHits.reduce((a, p) => a + p.z, 0) / rawHits.length
  );

  const ref = Math.abs(normal.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0);
  const uAxis = normalize(cross(ref, normal));
  const vAxis = normalize(cross(normal, uAxis));

  const withAngles = rawHits.map((p) => {
    const d = sub(p, centroid);
    const u = dot(d, uAxis);
    const v = dot(d, vAxis);
    return { p, u, v, ang: Math.atan2(v, u) };
  });
  withAngles.sort((a, b) => a.ang - b.ang);

  return {
    pts3D: withAngles.map((w) => w.p),
    pts2DLocal: withAngles.map((w) => ({ u: w.u, v: w.v })),
  };
}

function hatchPolygon2D(poly: Vec2[], spacing = 4.5): SheetLine[] {
  if (poly.length < 3) return [];
  const lines: SheetLine[] = [];
  const c = Math.SQRT1_2;
  const s = Math.SQRT1_2;
  const rot = poly.map((p) => ({ u: p.u * c + p.v * s, v: -p.u * s + p.v * c }));
  const minV = Math.min(...rot.map((p) => p.v));
  const maxV = Math.max(...rot.map((p) => p.v));

  for (let y = minV + spacing * 0.5; y < maxV; y += spacing) {
    const xs: number[] = [];
    for (let i = 0; i < rot.length; i++) {
      const a = rot[i];
      const b = rot[(i + 1) % rot.length];
      if ((a.v <= y && b.v > y) || (b.v <= y && a.v > y)) {
        const t = (y - a.v) / (b.v - a.v);
        xs.push(a.u + t * (b.u - a.u));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const p1 = { u: xs[k] * c - y * s, v: xs[k] * s + y * c };
      const p2 = { u: xs[k + 1] * c - y * s, v: xs[k + 1] * s + y * c };
      lines.push({ x1: p1.u, y1: p1.v, x2: p2.u, y2: p2.v, layer: 'hatch' });
    }
  }
  return lines;
}

/**
 * Exact 2-Step & 3-Step Solid Projection + Sectioning on FINAL Inclined Stage (B8a) +
 * Exact Full-Apex Frustum Development (B8b) + Base-Rotated Stage Support (B7)!
 */
function buildSolidMultiStageSheet(
  s: SolidParams,
  name: string,
  solved: SolverResult,
  convention: 'first-angle' | 'third-angle'
): MultiStageSheetData {
  const lines: SheetLine[] = [];
  const arcs: SheetArc[] = [];
  const points: SheetPoint[] = [];
  const texts: SheetText[] = [];
  const bounds = emptyBounds();
  const settings = makeSheetProjectionSettings(convention);

  const stage2Tilt = solved.resolvedSolid?.stage2TiltDeg ?? 0;
  const stage3Rot = solved.resolvedSolid?.stage3RotationDeg ?? 0;
  const effTheta = solved.resolvedSolid?.effectiveTheta ?? s.theta ?? 90;
  const effPhi = solved.resolvedSolid?.effectivePhi ?? s.phi ?? 0;
  const appS3 = solved.resolvedSolid?.apparentStage3Angle ?? s.stage3Angle ?? 0;
  const usedLocus = Boolean(solved.resolvedSolid?.usedLocus);
  const restOnVP = (s.restingOn ?? 'hp_base').startsWith('vp_');

  const hasTiltStage = Math.abs(stage2Tilt) > 0.1;
  const hasRotStage = Math.abs(stage3Rot) > 0.1;
  // B7: Even when stage2Tilt === 0 (e.g. vp_base with edge at 30° to HP, W13-8), render the rotated stage!
  const hasStage2 = hasTiltStage || hasRotStage;
  const hasStage3 = hasTiltStage && hasRotStage;
  const stageCount: 1 | 2 | 3 = hasStage3 ? 3 : hasStage2 ? 2 : 1;

  // Stage 1
  const m1 = buildSolidStageMesh(s, name, solved, 1);
  const s1Shift = 22 - m1.boundingBox.min.x;
  const s1 = addProjectedStageToSheet(
    m1,
    s1Shift,
    `STAGE 1 (${restOnVP ? 'Base on VP' : 'Simple Position'})`,
    '',
    settings,
    lines,
    points,
    texts
  );
  let cursorX = s1.maxX + 48;

  let activeSecMesh: MeshData = m1;
  let activeSecShift = s1Shift;

  // Stage 2
  let s2: ReturnType<typeof addProjectedStageToSheet> | null = null;
  if (hasStage2) {
    // If no tilt stage (only base rotation like W13-8), build Stage 3 mesh as Stage 2!
    const m2 = hasTiltStage
      ? buildSolidStageMesh(s, name, solved, 2)
      : buildSolidStageMesh(s, name, solved, 3);
    const s2Shift = cursorX - m2.boundingBox.min.x;
    const s2Title = hasTiltStage
      ? restOnVP
        ? `STAGE 2 (Axis φ=${effPhi.toFixed(1)}° to VP)`
        : `STAGE 2 (Axis θ=${effTheta.toFixed(1)}° to HP)`
      : `STAGE 2 (Rotated @ ${appS3.toFixed(1)}°)`;
    s2 = addProjectedStageToSheet(m2, s2Shift, s2Title, '1', settings, lines, points, texts);
    for (let i = 0; i < Math.min(s1.tvPts.length, s2.tvPts.length); i++) {
      if (!restOnVP) {
        lines.push({ x1: s1.tvPts[i].u, y1: s1.tvPts[i].v, x2: s2.tvPts[i].u, y2: s2.tvPts[i].v, layer: 'locus' });
      } else {
        lines.push({ x1: s1.fvPts[i].u, y1: s1.fvPts[i].v, x2: s2.fvPts[i].u, y2: s2.fvPts[i].v, layer: 'locus' });
      }
    }
    activeSecMesh = m2;
    activeSecShift = s2Shift;
    cursorX = s2.maxX + 52;
  }

  // Stage 3
  if (hasStage3 && s2) {
    const m3 = buildSolidStageMesh(s, name, solved, 3);
    const s3Shift = cursorX - m3.boundingBox.min.x;
    const s3Title = usedLocus
      ? `STAGE 3 (True ${(s.stage3Angle ?? 0).toFixed(1)}° → Apparent ${appS3.toFixed(1)}°)`
      : `STAGE 3 (Final @ ${appS3.toFixed(1)}°)`;
    const s3 = addProjectedStageToSheet(m3, s3Shift, s3Title, '2', settings, lines, points, texts);
    for (let i = 0; i < Math.min(s2.fvPts.length, s3.fvPts.length); i++) {
      if (!restOnVP) {
        lines.push({ x1: s2.fvPts[i].u, y1: s2.fvPts[i].v, x2: s3.fvPts[i].u, y2: s3.fvPts[i].v, layer: 'locus' });
      } else {
        lines.push({ x1: s2.tvPts[i].u, y1: s2.tvPts[i].v, x2: s3.tvPts[i].u, y2: s3.tvPts[i].v, layer: 'locus' });
      }
    }
    activeSecMesh = m3;
    activeSecShift = s3Shift;
    cursorX = s3.maxX + 45;
  }

  // B8a: Compute Section Plane on the FINAL inclined stage mesh (activeSecMesh), NOT hardcoded to m1!
  if (s.sectionEnabled && activeSecMesh.sectionPlane) {
    const { pts3D, pts2DLocal } = computeSectionPolygon3D(activeSecMesh);
    const secType = activeSecMesh.sectionPlane.type;
    const secAng = activeSecMesh.sectionPlane.angle;
    const cx = (activeSecMesh.boundingBox.min.x + activeSecMesh.boundingBox.max.x) / 2 + activeSecShift;
    const spanR =
      Math.max(
        activeSecMesh.boundingBox.max.x - activeSecMesh.boundingBox.min.x,
        activeSecMesh.boundingBox.max.y - activeSecMesh.boundingBox.min.y
      ) *
        0.65 +
      10;

    if (secType === 'aip' || secType === 'horizontal') {
      const zCut = activeSecMesh.sectionPlane.point.z;
      const tanA = Math.tan(degToRad(secAng));
      const xL = cx - spanR;
      const xR = cx + spanR;
      lines.push({ x1: xL, y1: zCut - spanR * tanA, x2: xR, y2: zCut + spanR * tanA, layer: 'section' });
      texts.push({ x: xR + 2, y: zCut + spanR * tanA + 2, text: `V.T. (${secAng}°)`, layer: 'section', size: 3.6 });
    } else if (secType === 'avp' || secType === 'frontal') {
      const yCut = projectPoint2D(activeSecMesh.sectionPlane.point, 'top', settings).v;
      const tanA = Math.tan(degToRad(secAng));
      const xL = cx - spanR;
      const xR = cx + spanR;
      lines.push({ x1: xL, y1: yCut - spanR * tanA, x2: xR, y2: yCut + spanR * tanA, layer: 'section' });
      texts.push({ x: xR + 2, y: yCut + spanR * tanA - 4, text: `H.T. (${secAng}°)`, layer: 'section', size: 3.6 });
    }

    if (pts3D.length >= 3) {
      const hatchView = secType === 'avp' || secType === 'frontal' ? 'front' : 'top';
      const secPolyProj = pts3D.map((p) => {
        const pr = projectPoint2D(p, hatchView, settings);
        return { u: pr.u + activeSecShift, v: pr.v };
      });
      for (let i = 0; i < secPolyProj.length; i++) {
        const nxt = (i + 1) % secPolyProj.length;
        lines.push({ x1: secPolyProj[i].u, y1: secPolyProj[i].v, x2: secPolyProj[nxt].u, y2: secPolyProj[nxt].v, layer: 'section' });
      }
      lines.push(...hatchPolygon2D(secPolyProj, 4.5));

      if (s.showTrueShape !== false) {
        const tsMinU = Math.min(...pts2DLocal.map((p) => p.u));
        const tsMaxU = Math.max(...pts2DLocal.map((p) => p.u));
        const tsMinV = Math.min(...pts2DLocal.map((p) => p.v));
        const tsMaxV = Math.max(...pts2DLocal.map((p) => p.v));
        const tsShiftX = cursorX + 12 - tsMinU;
        const tsShiftY = 20 - tsMinV;
        const tsPoly = pts2DLocal.map((p) => ({ u: p.u + tsShiftX, v: p.v + tsShiftY }));
        for (let i = 0; i < tsPoly.length; i++) {
          const nxt = (i + 1) % tsPoly.length;
          lines.push({ x1: tsPoly[i].u, y1: tsPoly[i].v, x2: tsPoly[nxt].u, y2: tsPoly[nxt].v, layer: 'section' });
        }
        lines.push(...hatchPolygon2D(tsPoly, 4.5));
        texts.push({ x: cursorX + 10, y: tsMaxV + tsShiftY + 10, text: 'TRUE SHAPE OF SECTION', layer: 'stageGuide', size: 4.0 });
        cursorX += tsMaxU - tsMinU + 48;
      }
    }
  }

  // Exact Lateral Surface Development (including B8b full-apex Frustum development!)
  if (s.showDevelopment) {
    const devX = cursorX + 15;
    const h = getSolidEffectiveHeight(s);
    const baseR = getSolidBaseRadius(s);
    const sides = getSolidSideCount(s);
    const isFrustum = s.solidType === 'frustum_pyramid' || s.solidType === 'frustum_cone';
    const isPyramid =
      s.solidType.includes('pyramid') || s.solidType === 'cone' || s.solidType === 'tetrahedron';
    const isConeLike = s.solidType === 'cone' || s.solidType === 'frustum_cone';
    const secPlane = m1.sectionPlane;

    texts.push({ x: devX, y: h + 14, text: 'SURFACE DEVELOPMENT', layer: 'stageGuide', size: 4.0 });

    if (isFrustum) {
      // B8b: Exact Full-Apex Radial-Line Development for Frustum of Pyramid / Cone!
      const topR = Math.min(baseR * 0.95, s.topRadius ?? baseR * 0.45);
      const fullH = (h * baseR) / Math.max(1e-3, baseR - topR);
      const fullSlant = Math.hypot(baseR, fullH);
      const topSlant = Math.hypot(topR, fullH - h);
      const devSteps = isConeLike ? 24 : sides;
      const baseEdge = 2 * baseR * Math.sin(Math.PI / devSteps);
      const stepAngleRad = isConeLike
        ? (2 * Math.PI * baseR) / (fullSlant * devSteps)
        : 2 * Math.asin(Math.min(1, baseEdge / (2 * fullSlant)));
      const totalSectorRad = stepAngleRad * devSteps;

      const apexX = devX + fullSlant * 0.8;
      const apexY = fullSlant + 5;
      const startA = -Math.PI / 2 - totalSectorRad / 2;
      const botPts: Vec2[] = [];
      const topPts: Vec2[] = [];

      for (let i = 0; i <= devSteps; i++) {
        const ang = startA + i * stepAngleRad;
        const bx = apexX + fullSlant * Math.cos(ang);
        const by = apexY + fullSlant * Math.sin(ang);
        const tx = apexX + topSlant * Math.cos(ang);
        const ty = apexY + topSlant * Math.sin(ang);
        botPts.push({ u: bx, v: by });
        topPts.push({ u: tx, v: ty });
        // Draw frustum lateral edge strictly from topSlant to fullSlant!
        lines.push({
          x1: tx,
          y1: ty,
          x2: bx,
          y2: by,
          layer: isConeLike && i > 0 && i < devSteps ? 'projector' : 'development',
        });
        // Construction ray to virtual apex
        lines.push({ x1: apexX, y1: apexY, x2: tx, y2: ty, layer: 'projector' });
      }
      for (let i = 0; i < botPts.length - 1; i++) {
        lines.push({ x1: botPts[i].u, y1: botPts[i].v, x2: botPts[i + 1].u, y2: botPts[i + 1].v, layer: 'development' });
        lines.push({ x1: topPts[i].u, y1: topPts[i].v, x2: topPts[i + 1].u, y2: topPts[i + 1].v, layer: 'development' });
      }
      cursorX = apexX + fullSlant + 20;
    } else if (!isPyramid) {
      const devSteps = s.solidType === 'cylinder' || s.solidType === 'hollow_cylinder' ? 24 : sides;
      const sideLen = 2 * baseR * Math.sin(Math.PI / devSteps);
      const totalPerim = devSteps * sideLen;
      lines.push({ x1: devX, y1: 0, x2: devX + totalPerim, y2: 0, layer: 'development' });
      lines.push({ x1: devX, y1: h, x2: devX + totalPerim, y2: h, layer: 'projector' });

      const cutPts: Vec2[] = [];
      for (let i = 0; i <= devSteps; i++) {
        const idx = Math.floor(((i % devSteps) / devSteps) * sides);
        const px = devX + i * sideLen;
        let cutZ = h;
        if (s.sectionEnabled && secPlane && m1.vertices.length >= 2 * sides) {
          const bV = m1.vertices[idx];
          const tV = m1.vertices[sides + idx];
          const dB = dot(sub(bV, secPlane.point), secPlane.normal);
          const dT = dot(sub(tV, secPlane.point), secPlane.normal);
          if ((dB <= 0 && dT >= 0) || (dB >= 0 && dT <= 0)) {
            const t = Math.abs(dT - dB) > 1e-6 ? -dB / (dT - dB) : 1;
            cutZ = Math.max(0, Math.min(h, t * h));
          }
        }
        lines.push({ x1: px, y1: 0, x2: px, y2: cutZ, layer: i === 0 || i === devSteps ? 'development' : 'projector' });
        cutPts.push({ u: px, v: cutZ });
      }
      for (let i = 0; i < cutPts.length - 1; i++) {
        lines.push({ x1: cutPts[i].u, y1: cutPts[i].v, x2: cutPts[i + 1].u, y2: cutPts[i + 1].v, layer: 'development' });
      }
      cursorX = devX + totalPerim + 35;
    } else {
      const devSteps = isConeLike ? 24 : sides;
      const slant = Math.hypot(baseR, h);
      const baseEdge = 2 * baseR * Math.sin(Math.PI / devSteps);
      const stepAngleRad = isConeLike
        ? (2 * Math.PI * baseR) / (slant * devSteps)
        : 2 * Math.asin(Math.min(1, baseEdge / (2 * slant)));
      const totalSectorRad = stepAngleRad * devSteps;

      const apexX = devX + slant * 0.85;
      const apexY = slant + 5;
      const startA = -Math.PI / 2 - totalSectorRad / 2;
      const basePtsDev: Vec2[] = [];
      const cutPtsDev: Vec2[] = [];

      for (let i = 0; i <= devSteps; i++) {
        const idx = Math.floor(((i % devSteps) / devSteps) * sides);
        const ang = startA + i * stepAngleRad;
        const bx = apexX + slant * Math.cos(ang);
        const by = apexY + slant * Math.sin(ang);
        basePtsDev.push({ u: bx, v: by });
        lines.push({ x1: apexX, y1: apexY, x2: bx, y2: by, layer: isConeLike && i > 0 && i < devSteps ? 'projector' : 'development' });

        if (s.sectionEnabled && secPlane && m1.vertices.length > sides) {
          const bV = m1.vertices[idx];
          const apexV = m1.vertices[sides];
          const dB = dot(sub(bV, secPlane.point), secPlane.normal);
          const dA = dot(sub(apexV, secPlane.point), secPlane.normal);
          let radialFromApex = slant;
          if ((dB <= 0 && dA >= 0) || (dB >= 0 && dA <= 0)) {
            const t = Math.abs(dA - dB) > 1e-6 ? -dB / (dA - dB) : 0;
            const hit3D = lerp(bV, apexV, Math.max(0, Math.min(1, t)));
            radialFromApex = distance(apexV, hit3D);
          }
          cutPtsDev.push({
            u: apexX + radialFromApex * Math.cos(ang),
            v: apexY + radialFromApex * Math.sin(ang),
          });
        }
      }
      for (let i = 0; i < basePtsDev.length - 1; i++) {
        lines.push({ x1: basePtsDev[i].u, y1: basePtsDev[i].v, x2: basePtsDev[i + 1].u, y2: basePtsDev[i + 1].v, layer: 'development' });
        if (cutPtsDev.length > i + 1) {
          lines.push({ x1: cutPtsDev[i].u, y1: cutPtsDev[i].v, x2: cutPtsDev[i + 1].u, y2: cutPtsDev[i + 1].v, layer: 'section' });
        }
      }
      cursorX = apexX + slant + 20;
    }
  }

  lines.push({ x1: 0, y1: 0, x2: cursorX, y2: 0, layer: 'xy' });
  texts.push({ x: 2, y: 4, text: 'X', layer: 'xy' });
  texts.push({ x: cursorX - 8, y: 4, text: 'Y', layer: 'xy' });

  lines.forEach((l) => { updateBounds(bounds, l.x1, l.y1); updateBounds(bounds, l.x2, l.y2); });

  return {
    title: `${name} — ${stageCount}-Stage Projection${s.sectionEnabled ? ' + Section' : ''}${s.showDevelopment ? ' + Development' : ''}`,
    subtitle: `Resting: ${(s.restingOn ?? 'hp_base').replace(/_/g, ' ')} | Axis θ=${effTheta.toFixed(1)}°, φ=${effPhi.toFixed(1)}° | ${convention === 'first-angle' ? '1st Angle' : '3rd Angle'}`,
    stageCount,
    lines,
    arcs,
    points,
    texts,
    bounds,
  };
}

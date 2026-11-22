import {
  MeshData,
  ProjectedEdge2D,
  ProjectedViewData,
  ProjectionSettings,
  Vec2,
  Vec3,
} from '../types/engineering';
import { dot, lerp, sub } from '../geometry/math';

export type ViewType = 'front' | 'top' | 'side' | 'left_side' | 'right_side' | 'auxiliary';

/**
 * Project a 3D engineering point (X, Y, Z) onto 2D view coordinates (u, v).
 * - B9: Supports BOTH AVP (auxiliaryType === 'avp', preserves Z height) and AIP (preserves Y depth)!
 * - B13: Supports BOTH left_side (LHSV: u = +Y) and right_side (RHSV: u = -Y) in BOTH conventions!
 */
export function projectPoint2D(
  p: Vec3,
  view: ViewType,
  settings?: Pick<ProjectionSettings, 'convention' | 'auxiliaryAngle' | 'auxiliaryType'>
): Vec2 {
  switch (view) {
    case 'front':
      return { u: p.x, v: p.z };
    case 'top':
      return {
        u: p.x,
        v: settings?.convention === 'third-angle' ? p.y : -p.y,
      };
    case 'left_side':
      return { u: p.y, v: p.z };
    case 'right_side':
      return { u: -p.y, v: p.z };
    case 'side':
      return {
        u: settings?.convention === 'third-angle' ? -p.y : p.y,
        v: p.z,
      };
    case 'auxiliary': {
      const ang = ((settings?.auxiliaryAngle ?? 45) * Math.PI) / 180;
      if (settings?.auxiliaryType === 'avp') {
        // AVP (⊥ HP, inclined at ψ to VP): rotates about Z, preserves true Z height!
        return {
          u: p.x * Math.cos(ang) + p.y * Math.sin(ang),
          v: p.z,
        };
      }
      // AIP (⊥ VP, inclined at χ to HP): rotates about Y, preserves true Y depth!
      return {
        u: p.x * Math.cos(ang) + p.z * Math.sin(ang),
        v: p.y,
      };
    }
  }
}

function getViewDirection(view: ViewType, settings?: ProjectionSettings): Vec3 {
  switch (view) {
    case 'front':
      return { x: 0, y: 1, z: 0 };
    case 'top':
      return { x: 0, y: 0, z: 1 };
    case 'left_side':
      return { x: -1, y: 0, z: 0 };
    case 'right_side':
      return { x: 1, y: 0, z: 0 };
    case 'side':
      return settings?.convention === 'third-angle'
        ? { x: 1, y: 0, z: 0 }
        : { x: -1, y: 0, z: 0 };
    case 'auxiliary': {
      const ang = ((settings?.auxiliaryAngle ?? 45) * Math.PI) / 180;
      if (settings?.auxiliaryType === 'avp') {
        return { x: -Math.sin(ang), y: Math.cos(ang), z: 0 };
      }
      return { x: -Math.sin(ang), y: 0, z: Math.cos(ang) };
    }
  }
}

function getDepth(p: Vec3, viewDir: Vec3): number {
  return dot(p, viewDir);
}

function pointInTri2D(pt: Vec2, a: Vec2, b: Vec2, c: Vec2): [boolean, number, number, number] {
  const denom = (b.v - c.v) * (a.u - c.u) + (c.u - b.u) * (a.v - c.v);
  if (Math.abs(denom) < 1e-9) return [false, 0, 0, 0];
  const w1 = ((b.v - c.v) * (pt.u - c.u) + (c.u - b.u) * (pt.v - c.v)) / denom;
  const w2 = ((c.v - a.v) * (pt.u - c.u) + (a.u - c.u) * (pt.v - c.v)) / denom;
  const w3 = 1 - w1 - w2;
  const inside = w1 > 1e-4 && w2 > 1e-4 && w3 > 1e-4;
  return [inside, w1, w2, w3];
}

export function projectMeshToView(
  mesh: MeshData,
  view: ViewType,
  settings: ProjectionSettings
): ProjectedViewData {
  const viewDir = getViewDirection(view, settings);
  const rawEdges: ProjectedEdge2D[] = [];

  const faceFrontFacing = mesh.faces.map((f) => dot(f.normal, viewDir) > 1e-4);
  const frontFaces2D = mesh.faces
    .map((f, idx) => ({ f, idx }))
    .filter(({ idx }) => faceFrontFacing[idx])
    .map(({ f }) => {
      const v0 = mesh.vertices[f.indices[0]];
      const v1 = mesh.vertices[f.indices[1]];
      const v2 = mesh.vertices[f.indices[2]];
      return {
        a2: projectPoint2D(v0, view, settings),
        b2: projectPoint2D(v1, view, settings),
        c2: projectPoint2D(v2, view, settings),
        da: getDepth(v0, viewDir),
        db: getDepth(v1, viewDir),
        dc: getDepth(v2, viewDir),
      };
    });

  const sampleTs = [0.22, 0.5, 0.78];

  for (const edge of mesh.edges) {
    const start2 = projectPoint2D(edge.start, view, settings);
    const end2 = projectPoint2D(edge.end, view, settings);

    if (edge.kind === 'axis') {
      rawEdges.push({ start: start2, end: end2, visible: true, kind: 'axis' });
      continue;
    }

    if (Math.hypot(end2.u - start2.u, end2.v - start2.v) < 1e-3) {
      continue;
    }

    if (edge.smooth && edge.faceIndices && edge.faceIndices.length >= 2) {
      const hasFront = edge.faceIndices.some((fi) => faceFrontFacing[fi]);
      const hasBack = edge.faceIndices.some((fi) => !faceFrontFacing[fi]);
      if (!(hasFront && hasBack)) {
        continue;
      }
    }

    let isVisible = true;
    if (mesh.faces.length > 0) {
      if (edge.faceIndices && edge.faceIndices.length > 0) {
        isVisible = edge.faceIndices.some((fi) => faceFrontFacing[fi]);
      }
      if (isVisible && frontFaces2D.length > 0) {
        let occludedCount = 0;
        for (const t of sampleTs) {
          const pt3 = lerp(edge.start, edge.end, t);
          const pt2 = projectPoint2D(pt3, view, settings);
          const ptDepth = getDepth(pt3, viewDir);
          for (const tri of frontFaces2D) {
            const [inside, w1, w2, w3] = pointInTri2D(pt2, tri.a2, tri.b2, tri.c2);
            if (inside) {
              const triDepth = w1 * tri.da + w2 * tri.db + w3 * tri.dc;
              if (triDepth > ptDepth + 0.08) {
                occludedCount++;
                break;
              }
            }
          }
        }
        if (occludedCount >= 2) {
          isVisible = false;
        }
      }
    }

    rawEdges.push({
      start: start2,
      end: end2,
      visible: isVisible,
      kind: isVisible ? 'visible' : 'hidden',
    });
  }

  const activeSec = mesh.sectionPlane
    ? { point: mesh.sectionPlane.point, normal: mesh.sectionPlane.normal }
    : settings.sectionEnabled
    ? {
        point:
          settings.sectionAxis === 'x'
            ? { x: settings.sectionOffset, y: 0, z: 0 }
            : settings.sectionAxis === 'y'
            ? { x: 0, y: settings.sectionOffset, z: 0 }
            : { x: 0, y: 0, z: settings.sectionOffset },
        normal:
          settings.sectionAxis === 'x'
            ? { x: 1, y: 0, z: 0 }
            : settings.sectionAxis === 'y'
            ? { x: 0, y: 1, z: 0 }
            : { x: 0, y: 0, z: 1 },
      }
    : null;

  if (activeSec && mesh.faces.length > 0) {
    const signedDist = (v: Vec3) => dot(sub(v, activeSec.point), activeSec.normal);
    for (const f of mesh.faces) {
      const verts = f.indices.map((i) => mesh.vertices[i]);
      const hits: Vec3[] = [];
      for (let i = 0; i < 3; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % 3];
        const da = signedDist(a);
        const db = signedDist(b);
        if ((da > 1e-5 && db < -1e-5) || (da < -1e-5 && db > 1e-5)) {
          const t = da / (da - db);
          hits.push(lerp(a, b, t));
        }
      }
      if (hits.length === 2) {
        rawEdges.push({
          start: projectPoint2D(hits[0], view, settings),
          end: projectPoint2D(hits[1], view, settings),
          visible: true,
          kind: 'section',
        });
      }
    }
  }

  const suffix = view === 'front' ? "'" : view === 'side' || view === 'left_side' || view === 'right_side' ? "''" : '';
  const points = mesh.points.map((pt) => ({
    pos: projectPoint2D(pt.position, view, settings),
    label: `${pt.label.toLowerCase()}${suffix}`,
    color: pt.color,
  }));

  const labels = mesh.labels.map((lb) => ({
    pos: projectPoint2D(lb.position, view, settings),
    text: `${lb.text}${suffix}`,
    color: lb.color,
  }));

  if (settings.showTraces && mesh.traces) {
    if (mesh.traces.ht) {
      const ht2 = projectPoint2D(mesh.traces.ht, view, settings);
      points.push({ pos: ht2, label: 'H.T.', color: '#f59e0b' });
    }
    if (mesh.traces.vt) {
      const vt2 = projectPoint2D(mesh.traces.vt, view, settings);
      points.push({ pos: vt2, label: 'V.T.', color: '#ec4899' });
    }
  }

  const dimensions: ProjectedViewData['dimensions'] = [];
  if (settings.showDimensions && mesh.points.length === 2 && rawEdges.filter((e) => e.kind === 'visible').length === 1) {
    const e = rawEdges.find((ed) => ed.kind === 'visible')!;
    const len2D = Math.hypot(e.end.u - e.start.u, e.end.v - e.start.v);
    if (len2D > 1e-2) {
      dimensions.push({
        from: e.start,
        to: e.end,
        text: `${len2D.toFixed(1)}`,
        offset: 12,
      });
    }
  }

  if (settings.showProjectors && view !== 'auxiliary') {
    for (const pt of mesh.points) {
      const p2 = projectPoint2D(pt.position, view, settings);
      if (view === 'front' || view === 'top') {
        rawEdges.push({
          start: p2,
          end: { u: p2.u, v: 0 },
          visible: true,
          kind: 'projector',
        });
      } else {
        rawEdges.push({
          start: p2,
          end: { u: 0, v: p2.v },
          visible: true,
          kind: 'projector',
        });
      }
    }
  }

  const order: Record<ProjectedEdge2D['kind'], number> = {
    projector: 0,
    trace: 1,
    center: 2,
    axis: 2,
    hidden: 3,
    visible: 4,
    section: 5,
  };
  rawEdges.sort((a, b) => order[a.kind] - order[b.kind]);

  return { view, edges: rawEdges, points, labels, dimensions };
}

export function edgeLength3D(a: Vec3, b: Vec3): number {
  const d = sub(b, a);
  return Math.hypot(d.x, d.y, d.z);
}

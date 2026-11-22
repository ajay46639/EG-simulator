export type EngineeringCurveMode =
  | 'conic_eccentricity'
  | 'ellipse_concentric'
  | 'parabola_rectangle'
  | 'cycloid'
  | 'epicycloid'
  | 'hypocycloid'
  | 'involute_circle'
  | 'involute_polygon'
  | 'archimedean_spiral'
  | 'oscillating_link'
  | 'revolving_rod';

export type EngineeringScaleMode = 'plain' | 'diagonal' | 'chords';

export interface CurveDrawingOutput {
  title: string;
  summary: string;
  curvePolylines: Array<Array<{ x: number; y: number }>>;
  helperLines: Array<{ x1: number; y1: number; x2: number; y2: number; dashed?: boolean; color?: string }>;
  helperCircles: Array<{ cx: number; cy: number; r: number; dashed?: boolean }>;
  tangentNormal: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; color: string }>;
  labels: Array<{ x: number; y: number; text: string }>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

function calcBounds(pts: Array<{ x: number; y: number }>, lines: Array<{ x1: number; y1: number; x2: number; y2: number }>) {
  let minX = -20, maxX = 160, minY = -80, maxY = 80;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  for (const l of lines) {
    minX = Math.min(minX, l.x1, l.x2);
    maxX = Math.max(maxX, l.x1, l.x2);
    minY = Math.min(minY, l.y1, l.y2);
    maxY = Math.max(maxY, l.y1, l.y2);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Directrix-Focus Method: Ellipse (e<1), Parabola (e=1), Hyperbola (e>1) + Tangent & Normal
 */
export function buildConicByEccentricity(
  focusDist: number,
  eccentricity: number,
  tangentDistFromFocus: number
): CurveDrawingOutput {
  const e = Math.max(0.15, Math.min(3.5, eccentricity));
  const xV = focusDist / (1 + e);
  const typeName = e < 0.999 ? 'Ellipse' : e > 1.001 ? 'Hyperbola' : 'Parabola';

  const upper: Array<{ x: number; y: number }> = [];
  const lower: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [
    { x1: 0, y1: -95, x2: 0, y2: 95, color: '#f59e0b' },
    { x1: -10, y1: 0, x2: 190, y2: 0, dashed: true, color: '#94a3b8' },
    { x1: xV, y1: 0, x2: xV, y2: focusDist - xV, dashed: true, color: '#38bdf8' },
    { x1: 0, y1: 0, x2: 180, y2: 180 * e, dashed: true, color: '#a855f7' },
  ];
  const helperCircles: CurveDrawingOutput['helperCircles'] = [];
  const tangentNormal: CurveDrawingOutput['tangentNormal'] = [];

  const xMax = e < 0.99 ? Math.min(200, focusDist / (1 - e)) : xV + 110;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = xV + (i / steps) * (xMax - xV);
    const r = e * x;
    const dx = x - focusDist;
    const ySq = r * r - dx * dx;
    if (ySq >= 0) {
      const y = Math.sqrt(ySq);
      upper.push({ x, y });
      lower.push({ x, y: -y });
      if (i % 10 === 0 && i > 0) {
        helperLines.push({ x1: x, y1: -y, x2: x, y2: y, dashed: true, color: '#475569' });
      }
    }
  }

  const xP = tangentDistFromFocus / e;
  const yPSq = tangentDistFromFocus * tangentDistFromFocus - (xP - focusDist) ** 2;
  const labels: Array<{ x: number; y: number; text: string }> = [
    { x: 2, y: 88, text: 'D (Directrix)' },
    { x: focusDist, y: -8, text: 'F' },
    { x: xV, y: -8, text: 'V' },
  ];

  if (yPSq > 0) {
    const yP = Math.sqrt(yPSq);
    const yT = (focusDist * (xP - focusDist)) / yP;
    helperLines.push({ x1: xP, y1: yP, x2: focusDist, y2: 0, dashed: true, color: '#22c55e' });
    helperLines.push({ x1: focusDist, y1: 0, x2: 0, y2: yT, dashed: true, color: '#22c55e' });

    const tx = xP, ty = yP - yT;
    const tLen = Math.hypot(tx, ty) || 1;
    const ux = tx / tLen, uy = ty / tLen;
    tangentNormal.push({
      x1: xP - ux * 40,
      y1: yP - uy * 40,
      x2: xP + ux * 40,
      y2: yP + uy * 40,
      label: 'Tangent',
      color: '#ef4444',
    });
    tangentNormal.push({
      x1: xP + uy * 35,
      y1: yP - ux * 35,
      x2: xP - uy * 35,
      y2: yP + ux * 35,
      label: 'Normal',
      color: '#10b981',
    });
    labels.push({ x: xP + 3, y: yP + 4, text: `P (PF=${tangentDistFromFocus})` });
    labels.push({ x: 2, y: yT, text: 'T' });
  }

  const allPts = [...upper, ...lower];
  return {
    title: `${typeName} by Directrix-Focus Method (e = ${e.toFixed(3)})`,
    summary: `Focus distance = ${focusDist} mm, Vertex V at ${xV.toFixed(2)} mm from Directrix. Tangent & Normal at ${tangentDistFromFocus} mm from F.`,
    curvePolylines: [upper, lower],
    helperLines,
    helperCircles,
    tangentNormal,
    labels,
    bounds: calcBounds(allPts, helperLines),
  };
}

/** Ellipse by Concentric Circle Method */
export function buildEllipseConcentric(majorDia: number, minorDia: number): CurveDrawingOutput {
  const a = majorDia / 2;
  const b = minorDia / 2;
  const pts: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [
    { x1: -a - 15, y1: 0, x2: a + 15, y2: 0, dashed: true, color: '#f59e0b' },
    { x1: 0, y1: -a - 15, x2: 0, y2: a + 15, dashed: true, color: '#f59e0b' },
  ];
  const helperCircles = [
    { cx: 0, cy: 0, r: a, dashed: true },
    { cx: 0, cy: 0, r: b, dashed: true },
  ];

  for (let i = 0; i <= 72; i++) {
    const ang = (i / 72) * Math.PI * 2;
    pts.push({ x: a * Math.cos(ang), y: b * Math.sin(ang) });
  }
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const ox = a * Math.cos(ang), oy = a * Math.sin(ang);
    const ix = b * Math.cos(ang), iy = b * Math.sin(ang);
    helperLines.push({ x1: 0, y1: 0, x2: ox, y2: oy, dashed: true, color: '#475569' });
    helperLines.push({ x1: ox, y1: oy, x2: ox, y2: iy, dashed: true, color: '#38bdf8' });
    helperLines.push({ x1: ix, y1: iy, x2: ox, y2: iy, dashed: true, color: '#38bdf8' });
  }

  return {
    title: `Ellipse by Concentric Circle Method (${majorDia} × ${minorDia} mm)`,
    summary: `Major axis = ${majorDia} mm (a=${a}), Minor axis = ${minorDia} mm (b=${b}), 12 radial divisions.`,
    curvePolylines: [pts],
    helperLines,
    helperCircles,
    tangentNormal: [],
    labels: [
      { x: a + 3, y: 4, text: 'A' },
      { x: -a - 8, y: 4, text: 'B' },
      { x: 3, y: b + 4, text: 'C' },
      { x: 3, y: -b - 6, text: 'D' },
    ],
    bounds: calcBounds(pts, helperLines),
  };
}

/** N.D. Bhatt Ch. 6: Parabola by Rectangle Method */
export function buildParabolaRectangle(baseWidth: number, height: number): CurveDrawingOutput {
  const halfW = baseWidth / 2;
  const pts: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [
    // Enclosing rectangle
    { x1: -halfW, y1: 0, x2: halfW, y2: 0, color: '#f59e0b' },
    { x1: -halfW, y1: height, x2: halfW, y2: height, color: '#f59e0b' },
    { x1: -halfW, y1: 0, x2: -halfW, y2: height, color: '#f59e0b' },
    { x1: halfW, y1: 0, x2: halfW, y2: height, color: '#f59e0b' },
    { x1: 0, y1: 0, x2: 0, y2: height + 10, dashed: true, color: '#94a3b8' },
  ];

  for (let i = 0; i <= 60; i++) {
    const t = -1 + (i / 60) * 2;
    pts.push({ x: t * halfW, y: height * (1 - t * t) });
  }
  const divs = 6;
  for (let k = 1; k < divs; k++) {
    const f = k / divs;
    const xL = -halfW * f;
    const xR = halfW * f;
    const ySide = height * (1 - f);
    helperLines.push({ x1: 0, y1: height, x2: -halfW, y2: ySide, dashed: true, color: '#38bdf8' });
    helperLines.push({ x1: 0, y1: height, x2: halfW, y2: ySide, dashed: true, color: '#38bdf8' });
    helperLines.push({ x1: xL, y1: 0, x2: xL, y2: height, dashed: true, color: '#475569' });
    helperLines.push({ x1: xR, y1: 0, x2: xR, y2: height, dashed: true, color: '#475569' });
  }

  return {
    title: `Parabola by Rectangle Method (Base ${baseWidth} × Height ${height} mm)`,
    summary: `Symmetric parabola with vertex O(0, ${height}) and ${divs} equal divisions on half-span & side.`,
    curvePolylines: [pts],
    helperLines,
    helperCircles: [],
    tangentNormal: [],
    labels: [
      { x: 2, y: height + 4, text: 'O (Vertex)' },
      { x: -halfW - 6, y: -6, text: 'A' },
      { x: halfW + 2, y: -6, text: 'B' },
    ],
    bounds: calcBounds(pts, helperLines),
  };
}

/** Cycloid with Generating Circle & Tangent/Normal */
export function buildCycloid(diameter: number, pointHeight: number): CurveDrawingOutput {
  const r = diameter / 2;
  const pts: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [
    { x1: -10, y1: 0, x2: 2 * Math.PI * r + 15, y2: 0, color: '#f59e0b' },
    { x1: 0, y1: r, x2: 2 * Math.PI * r, y2: r, dashed: true, color: '#38bdf8' },
  ];
  const helperCircles = [{ cx: 0, cy: r, r, dashed: true }];

  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    pts.push({ x: r * (t - Math.sin(t)), y: r * (1 - Math.cos(t)) });
  }
  for (let i = 1; i <= 12; i++) {
    const cx = (i / 12) * 2 * Math.PI * r;
    helperLines.push({ x1: cx, y1: 0, x2: cx, y2: r, dashed: true, color: '#475569' });
  }

  const tangentNormal: CurveDrawingOutput['tangentNormal'] = [];
  const clampedH = Math.max(1, Math.min(diameter - 0.5, pointHeight));
  const cosT = 1 - clampedH / r;
  const tP = Math.acos(Math.max(-1, Math.min(1, cosT)));
  const xP = r * (tP - Math.sin(tP));
  const yP = clampedH;
  const mx = r * tP;
  const nx = xP - mx, ny = yP;
  const nLen = Math.hypot(nx, ny) || 1;
  const unx = nx / nLen, uny = ny / nLen;
  tangentNormal.push({
    x1: mx,
    y1: 0,
    x2: xP + unx * 28,
    y2: yP + uny * 28,
    label: 'Normal',
    color: '#10b981',
  });
  tangentNormal.push({
    x1: xP - uny * 32,
    y1: yP + unx * 32,
    x2: xP + uny * 32,
    y2: yP - unx * 32,
    label: 'Tangent',
    color: '#ef4444',
  });

  return {
    title: `Cycloid (Generating Circle Ø${diameter} mm)`,
    summary: `Rolling length πD = ${(Math.PI * diameter).toFixed(2)} mm. Tangent & Normal at height ${clampedH.toFixed(1)} mm.`,
    curvePolylines: [pts],
    helperLines,
    helperCircles,
    tangentNormal,
    labels: [
      { x: 0, y: -7, text: 'P0' },
      { x: xP + 3, y: yP + 4, text: 'P' },
      { x: mx, y: -7, text: 'M' },
    ],
    bounds: calcBounds(pts, helperLines),
  };
}

/** N.D. Bhatt Ch. 6: Epicycloid & Hypocycloid (Rolling Circle r on Directing Circle R) */
export function buildTrochoidCircle(
  mode: 'epicycloid' | 'hypocycloid',
  rollingDia: number,
  directingDia: number
): CurveDrawingOutput {
  const r = Math.max(5, rollingDia / 2);
  const R = Math.max(r + 10, directingDia / 2);
  const sectorRad = (2 * Math.PI * r) / R; // θ = 360° * r / R
  const pts: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [];
  const helperCircles = [
    { cx: 0, cy: 0, r: R, dashed: false },
    { cx: 0, cy: 0, r: mode === 'epicycloid' ? R + r : R - r, dashed: true },
  ];

  const startAng = Math.PI / 2 - sectorRad / 2;
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const phi = startAng + u * sectorRad; // angle of center C around O
    const alpha = u * Math.PI * 2; // rolling rotation of generating circle
    if (mode === 'epicycloid') {
      const cx = (R + r) * Math.cos(phi);
      const cy = (R + r) * Math.sin(phi);
      const pAng = phi + Math.PI + alpha;
      pts.push({ x: cx + r * Math.cos(pAng), y: cy + r * Math.sin(pAng) });
    } else {
      const cx = (R - r) * Math.cos(phi);
      const cy = (R - r) * Math.sin(phi);
      const pAng = phi - alpha;
      pts.push({ x: cx + r * Math.cos(pAng), y: cy + r * Math.sin(pAng) });
    }
  }

  // Radial sector lines
  helperLines.push(
    { x1: 0, y1: 0, x2: (R + r) * Math.cos(startAng), y2: (R + r) * Math.sin(startAng), dashed: true, color: '#f59e0b' },
    { x1: 0, y1: 0, x2: (R + r) * Math.cos(startAng + sectorRad), y2: (R + r) * Math.sin(startAng + sectorRad), dashed: true, color: '#f59e0b' }
  );

  return {
    title: `${mode === 'epicycloid' ? 'Epicycloid' : 'Hypocycloid'} (r=${r}, R=${R} mm)`,
    summary: `Directing arc angle θ = 360° × r/R = ${((sectorRad * 180) / Math.PI).toFixed(1)}°.`,
    curvePolylines: [pts],
    helperLines,
    helperCircles,
    tangentNormal: [],
    labels: [{ x: 3, y: 3, text: 'O' }],
    bounds: calcBounds(pts, helperLines),
  };
}

/** Involute of Circle + Tangent & Normal */
export function buildInvoluteCircle(diameter: number): CurveDrawingOutput {
  const r = diameter / 2;
  const pts: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [];
  const helperCircles = [{ cx: 0, cy: 0, r, dashed: false }];

  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const x = r * (Math.cos(t) + t * Math.sin(t));
    const y = r * (Math.sin(t) - t * Math.cos(t));
    pts.push({ x, y });
    if (i % 6 === 0 && i > 0) {
      helperLines.push({ x1: r * Math.cos(t), y1: r * Math.sin(t), x2: x, y2: y, dashed: true, color: '#38bdf8' });
    }
  }

  // Tangent & Normal at t = 180° (π)
  const tP = Math.PI;
  const xP = r * (Math.cos(tP) + tP * Math.sin(tP));
  const yP = r * (Math.sin(tP) - tP * Math.cos(tP));
  const tx = r * Math.cos(tP), ty = r * Math.sin(tP);
  const nx = xP - tx, ny = yP - ty;
  const nLen = Math.hypot(nx, ny) || 1;
  const unx = nx / nLen, uny = ny / nLen;
  const tangentNormal = [
    { x1: tx, y1: ty, x2: xP + unx * 24, y2: yP + uny * 24, label: 'Normal', color: '#10b981' },
    { x1: xP - uny * 28, y1: yP + unx * 28, x2: xP + uny * 28, y2: yP - unx * 28, label: 'Tangent', color: '#ef4444' },
  ];

  return {
    title: `Involute of Circle (Ø${diameter} mm)`,
    summary: `Unwound string length πD = ${(Math.PI * diameter).toFixed(2)} mm with 12 tangent divisions & Tangent/Normal.`,
    curvePolylines: [pts],
    helperLines,
    helperCircles,
    tangentNormal,
    labels: [
      { x: r + 3, y: 0, text: 'P0' },
      { x: xP + 3, y: yP + 4, text: 'P' },
    ],
    bounds: calcBounds(pts, helperLines),
  };
}

/** Involute of Regular Polygon */
export function buildInvolutePolygon(sides: number, sideLen: number): CurveDrawingOutput {
  const n = Math.max(3, Math.round(sides));
  const R = sideLen / (2 * Math.sin(Math.PI / n));
  const verts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: R * Math.cos(a), y: R * Math.sin(a) };
  });

  const helperLines: CurveDrawingOutput['helperLines'] = [];
  for (let i = 0; i < n; i++) {
    const nxt = (i + 1) % n;
    helperLines.push({ x1: verts[i].x, y1: verts[i].y, x2: verts[nxt].x, y2: verts[nxt].y, color: '#f59e0b' });
  }

  const pts: Array<{ x: number; y: number }> = [];
  const arcStep = (2 * Math.PI) / n;
  for (let k = 1; k <= n; k++) {
    const center = verts[k % n];
    const prev = verts[(k - 1) % n];
    const startAngle = Math.atan2(prev.y - center.y, prev.x - center.x);
    const radius = k * sideLen;
    for (let j = 0; j <= 16; j++) {
      const a = startAngle + (j / 16) * arcStep;
      pts.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
    }
    helperLines.push({
      x1: center.x,
      y1: center.y,
      x2: center.x + radius * Math.cos(startAngle + arcStep),
      y2: center.y + radius * Math.sin(startAngle + arcStep),
      dashed: true,
      color: '#38bdf8',
    });
  }

  return {
    title: `Involute of Regular ${n}-gon (Side ${sideLen} mm)`,
    summary: `Perimeter = ${(n * sideLen).toFixed(1)} mm. Sequential circular arcs of radii 1s, 2s, ..., ${n}s.`,
    curvePolylines: [pts],
    helperLines,
    helperCircles: [],
    tangentNormal: [],
    labels: verts.map((v, i) => ({ x: v.x + 2, y: v.y + 2, text: `${i + 1}` })),
    bounds: calcBounds(pts, helperLines),
  };
}

/** N.D. Bhatt Ch. 6: Archimedean Spiral (r = rMin + (rMax - rMin) * θ / (2π * conv)) */
export function buildArchimedeanSpiral(maxRadius: number, minRadius = 10, convolutions = 1): CurveDrawingOutput {
  const pts: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [];
  const steps = Math.round(convolutions * 72);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * convolutions * Math.PI * 2;
    const r = minRadius + t * (maxRadius - minRadius);
    pts.push({ x: r * Math.cos(ang), y: r * Math.sin(ang) });
    if (i % 6 === 0 && i <= 72) {
      helperLines.push({ x1: 0, y1: 0, x2: maxRadius * Math.cos(ang), y2: maxRadius * Math.sin(ang), dashed: true, color: '#475569' });
    }
  }
  return {
    title: `Archimedean Spiral (r: ${minRadius} → ${maxRadius} mm, ${convolutions} rev)`,
    summary: `Uniform radial increase Δr = ${(maxRadius - minRadius).toFixed(1)} mm over ${convolutions} convolution(s).`,
    curvePolylines: [pts],
    helperLines,
    helperCircles: [{ cx: 0, cy: 0, r: maxRadius, dashed: true }],
    tangentNormal: [],
    labels: [{ x: 3, y: 3, text: 'O (Pole)' }],
    bounds: calcBounds(pts, helperLines),
  };
}

/** Oscillating Link / Revolving Rod Locus */
export function buildMechanismLocus(
  mode: 'oscillating_link' | 'revolving_rod',
  linkLength: number,
  swingRightDeg: number,
  swingLeftDeg = 0
): CurveDrawingOutput {
  const pts: Array<{ x: number; y: number }> = [];
  const helperLines: CurveDrawingOutput['helperLines'] = [];
  const steps = 72;

  if (mode === 'revolving_rod') {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = -t * Math.PI * 2;
      const r = t * linkLength;
      pts.push({ x: r * Math.cos(ang), y: r * Math.sin(ang) });
      if (i % 6 === 0) {
        helperLines.push({ x1: 0, y1: 0, x2: linkLength * Math.cos(ang), y2: linkLength * Math.sin(ang), dashed: true, color: '#475569' });
      }
    }
  } else {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let swingRad = 0;
      if (swingLeftDeg > 0) {
        if (t < 0.25) swingRad = (t / 0.25) * (swingRightDeg * Math.PI) / 180;
        else if (t < 0.75) swingRad = ((swingRightDeg - ((t - 0.25) / 0.5) * (swingRightDeg + swingLeftDeg)) * Math.PI) / 180;
        else swingRad = ((-swingLeftDeg + ((t - 0.75) / 0.25) * swingLeftDeg) * Math.PI) / 180;
      } else {
        swingRad = (t <= 0.5 ? t * 2 : (1 - t) * 2) * (swingRightDeg * Math.PI) / 180;
      }
      const ang = -Math.PI / 2 + swingRad;
      const r = swingLeftDeg > 0 ? (t <= 0.5 ? t * 2 : (1 - t) * 2) * linkLength : t * linkLength;
      pts.push({ x: r * Math.cos(ang), y: r * Math.sin(ang) });
      if (i % 9 === 0) {
        helperLines.push({ x1: 0, y1: 0, x2: linkLength * Math.cos(ang), y2: linkLength * Math.sin(ang), dashed: true, color: '#475569' });
      }
    }
  }

  return {
    title: mode === 'revolving_rod' ? `Revolving Rod Locus (L = ${linkLength} mm)` : `Oscillating Link OA Locus (L = ${linkLength} mm)`,
    summary: mode === 'revolving_rod'
      ? `1 clockwise revolution while point P slides A→B (Archimedean Spiral).`
      : `Swing right ${swingRightDeg}°${swingLeftDeg ? `, left ${swingLeftDeg}°` : ''} with uniform sliding velocity.`,
    curvePolylines: [pts],
    helperLines,
    helperCircles: [{ cx: 0, cy: 0, r: linkLength, dashed: true }],
    tangentNormal: [],
    labels: [{ x: 3, y: 4, text: 'O' }],
    bounds: calcBounds(pts, helperLines),
  };
}

/** Engineering Scales (Plain, Diagonal, Scale of Chords) */
export interface ScaleComputation {
  rfDisplay: string;
  rfNumeric: number;
  lengthOfScaleCm: number;
  majorDivisions: number;
  subDivisions: number;
  diagonalRows: number;
}

export function computeScale(
  rfNumerator: number,
  rfDenominator: number,
  maxLengthMeters: number,
  majorDivisions: number,
  subDivisions = 10,
  diagonalRows = 10
): ScaleComputation {
  const rf = rfNumerator / Math.max(1e-9, rfDenominator);
  const lengthOfScaleCm = rf * maxLengthMeters * 100;
  return {
    rfDisplay: `${rfNumerator} : ${rfDenominator}`,
    rfNumeric: rf,
    lengthOfScaleCm,
    majorDivisions: Math.max(2, Math.round(majorDivisions)),
    subDivisions: Math.max(2, Math.round(subDivisions)),
    diagonalRows: Math.max(2, Math.round(diagonalRows)),
  };
}

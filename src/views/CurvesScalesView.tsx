import React, { useMemo, useState } from 'react';
import {
  buildArchimedeanSpiral,
  buildConicByEccentricity,
  buildCycloid,
  buildEllipseConcentric,
  buildInvoluteCircle,
  buildInvolutePolygon,
  buildMechanismLocus,
  buildParabolaRectangle,
  buildTrochoidCircle,
  computeScale,
  EngineeringCurveMode,
  EngineeringScaleMode,
} from '../engineering/curvesAndScales';
import { Eye, EyeOff } from 'lucide-react';

interface CurvesScalesViewProps {
  section: 'curves' | 'scales';
  theme: 'dark' | 'light';
}

export const CurvesScalesView: React.FC<CurvesScalesViewProps> = ({ section, theme }) => {
  // Curves state
  const [curveMode, setCurveMode] = useState<EngineeringCurveMode>('conic_eccentricity');
  const [focusDist, setFocusDist] = useState(50);
  const [eccentricity, setEccentricity] = useState(0.667);
  const [tangentDist, setTangentDist] = useState(45);
  const [majorDia, setMajorDia] = useState(90);
  const [minorDia, setMinorDia] = useState(60);
  const [genDia, setGenDia] = useState(50);
  const [dirDia, setDirDia] = useState(150);
  const [polySides, setPolySides] = useState(5);
  const [polySideLen, setPolySideLen] = useState(30);
  const [linkLen, setLinkLen] = useState(80);
  const [swingRight, setSwingRight] = useState(60);
  const [swingLeft, setSwingLeft] = useState(0);
  const [showHelpers, setShowHelpers] = useState(true);

  // Scales state
  const [scaleMode, setScaleMode] = useState<EngineeringScaleMode>('diagonal');
  const [rfNum, setRfNum] = useState(3);
  const [rfDen, setRfDen] = useState(200);
  const [maxMeters, setMaxMeters] = useState(6);
  const [majorDivs, setMajorDivs] = useState(6);
  const [subDivs, setSubDivs] = useState(10);
  const [diagRows, setDiagRows] = useState(10);
  const [markReading, setMarkReading] = useState(4.37);
  const [chordAngle, setChordAngle] = useState(55);

  const labelFill = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const strokeMain = theme === 'dark' ? '#e2e8f0' : '#1e293b';

  const curveData = useMemo(() => {
    switch (curveMode) {
      case 'conic_eccentricity':
        return buildConicByEccentricity(focusDist, eccentricity, tangentDist);
      case 'ellipse_concentric':
        return buildEllipseConcentric(majorDia, minorDia);
      case 'parabola_rectangle':
        return buildParabolaRectangle(majorDia, minorDia);
      case 'cycloid':
        return buildCycloid(genDia, tangentDist);
      case 'epicycloid':
        return buildTrochoidCircle('epicycloid', genDia, dirDia);
      case 'hypocycloid':
        return buildTrochoidCircle('hypocycloid', genDia, dirDia);
      case 'involute_circle':
        return buildInvoluteCircle(genDia);
      case 'involute_polygon':
        return buildInvolutePolygon(polySides, polySideLen);
      case 'archimedean_spiral':
        return buildArchimedeanSpiral(linkLen, 10, 1);
      case 'oscillating_link':
        return buildMechanismLocus('oscillating_link', linkLen, swingRight, swingLeft);
      case 'revolving_rod':
        return buildMechanismLocus('revolving_rod', linkLen, 360, 0);
    }
  }, [curveMode, focusDist, eccentricity, tangentDist, majorDia, minorDia, genDia, dirDia, polySides, polySideLen, linkLen, swingRight, swingLeft]);

  const scaleInfo = useMemo(
    () => computeScale(rfNum, rfDen, maxMeters, majorDivs, subDivs, diagRows),
    [rfNum, rfDen, maxMeters, majorDivs, subDivs, diagRows]
  );

  if (section === 'curves') {
    const pad = 25;
    const minX = curveData.bounds.minX - pad;
    const w = Math.max(160, curveData.bounds.maxX - curveData.bounds.minX + pad * 2);
    const minY = -curveData.bounds.maxY - pad;
    const h = Math.max(120, curveData.bounds.maxY - curveData.bounds.minY + pad * 2);

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs">
          <select
            value={curveMode}
            onChange={(e) => setCurveMode(e.target.value as EngineeringCurveMode)}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
          >
            <option value="conic_eccentricity">Conic (Directrix-Focus: Ellipse/Parabola/Hyperbola)</option>
            <option value="ellipse_concentric">Ellipse (Concentric Circle Method)</option>
            <option value="parabola_rectangle">Parabola (Rectangle Method)</option>
            <option value="cycloid">Cycloid + Tangent & Normal</option>
            <option value="epicycloid">Epicycloid (Rolling outside R)</option>
            <option value="hypocycloid">Hypocycloid (Rolling inside R)</option>
            <option value="involute_circle">Involute of Circle + Tangent & Normal</option>
            <option value="involute_polygon">Involute of Polygon (Triangle / Square / Pentagon)</option>
            <option value="archimedean_spiral">Archimedean Spiral</option>
            <option value="oscillating_link">Oscillating Link OA Locus</option>
            <option value="revolving_rod">Revolving Rod AB Locus</option>
          </select>

          {curveMode === 'conic_eccentricity' && (
            <>
              <label className="flex items-center gap-1">
                <span>Focus</span>
                <input type="number" value={focusDist} onChange={(e) => setFocusDist(Number(e.target.value) || 50)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              <label className="flex items-center gap-1">
                <span>e</span>
                <input type="number" step="0.05" value={eccentricity} onChange={(e) => setEccentricity(Number(e.target.value) || 1)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              <button onClick={() => setEccentricity(0.667)} className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-500 text-[11px]">e=2/3</button>
              <button onClick={() => setEccentricity(1)} className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-500 text-[11px]">e=1</button>
              <button onClick={() => setEccentricity(1.5)} className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-500 text-[11px]">e=3/2</button>
              <label className="flex items-center gap-1">
                <span>T/N @</span>
                <input type="number" value={tangentDist} onChange={(e) => setTangentDist(Number(e.target.value) || 45)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
            </>
          )}

          {(curveMode === 'ellipse_concentric' || curveMode === 'parabola_rectangle') && (
            <>
              <label className="flex items-center gap-1">
                <span>{curveMode === 'parabola_rectangle' ? 'Base' : 'Major Ø'}</span>
                <input type="number" value={majorDia} onChange={(e) => setMajorDia(Number(e.target.value) || 90)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              <label className="flex items-center gap-1">
                <span>{curveMode === 'parabola_rectangle' ? 'Height' : 'Minor Ø'}</span>
                <input type="number" value={minorDia} onChange={(e) => setMinorDia(Number(e.target.value) || 60)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
            </>
          )}

          {(curveMode === 'cycloid' || curveMode === 'involute_circle' || curveMode === 'epicycloid' || curveMode === 'hypocycloid') && (
            <>
              <label className="flex items-center gap-1">
                <span>Rolling Ø</span>
                <input type="number" value={genDia} onChange={(e) => setGenDia(Number(e.target.value) || 50)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              {(curveMode === 'epicycloid' || curveMode === 'hypocycloid') && (
                <label className="flex items-center gap-1">
                  <span>Directing Ø</span>
                  <input type="number" value={dirDia} onChange={(e) => setDirDia(Number(e.target.value) || 150)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
                </label>
              )}
            </>
          )}

          {curveMode === 'involute_polygon' && (
            <>
              <label className="flex items-center gap-1">
                <span>Sides</span>
                <input type="number" min={3} max={8} value={polySides} onChange={(e) => setPolySides(Number(e.target.value) || 3)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              <label className="flex items-center gap-1">
                <span>Side(mm)</span>
                <input type="number" value={polySideLen} onChange={(e) => setPolySideLen(Number(e.target.value) || 30)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
            </>
          )}

          {(curveMode === 'oscillating_link' || curveMode === 'revolving_rod' || curveMode === 'archimedean_spiral') && (
            <>
              <label className="flex items-center gap-1">
                <span>Length / Max R</span>
                <input type="number" value={linkLen} onChange={(e) => setLinkLen(Number(e.target.value) || 80)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              {curveMode === 'oscillating_link' && (
                <>
                  <label className="flex items-center gap-1">
                    <span>Right°</span>
                    <input type="number" value={swingRight} onChange={(e) => setSwingRight(Number(e.target.value) || 60)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
                  </label>
                  <label className="flex items-center gap-1">
                    <span>Left°</span>
                    <input type="number" value={swingLeft} onChange={(e) => setSwingLeft(Number(e.target.value) || 0)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
                  </label>
                </>
              )}
            </>
          )}

          <button
            onClick={() => setShowHelpers((s) => !s)}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-medium"
          >
            {showHelpers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showHelpers ? 'Hide Helpers' : 'Show Helpers'}
          </button>
        </div>

        <div className={`flex-1 min-h-0 relative ${theme === 'dark' ? 'cad-grid-dark' : 'cad-grid-light'}`}>
          <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {showHelpers &&
              curveData.helperCircles.map((c, i) => (
                <circle
                  key={`hc_${i}`}
                  cx={c.cx}
                  cy={-c.cy}
                  r={c.r}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth={0.7}
                  strokeDasharray={c.dashed ? '3 2' : undefined}
                />
              ))}
            {showHelpers &&
              curveData.helperLines.map((l, i) => (
                <line
                  key={`hl_${i}`}
                  x1={l.x1}
                  y1={-l.y1}
                  x2={l.x2}
                  y2={-l.y2}
                  stroke={l.color || '#64748b'}
                  strokeWidth={0.65}
                  strokeDasharray={l.dashed ? '2.5 2' : undefined}
                />
              ))}
            {curveData.curvePolylines.map((poly, idx) => (
              <polyline
                key={`cp_${idx}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.8}
                points={poly.map((p) => `${p.x},${-p.y}`).join(' ')}
              />
            ))}
            {curveData.tangentNormal.map((tn, i) => (
              <g key={`tn_${i}`}>
                <line x1={tn.x1} y1={-tn.y1} x2={tn.x2} y2={-tn.y2} stroke={tn.color} strokeWidth={1.2} />
                <text x={tn.x2 + 2} y={-tn.y2} fontSize={4.5} fill={tn.color} fontFamily="monospace">
                  {tn.label}
                </text>
              </g>
            ))}
            {showHelpers &&
              curveData.labels.map((lb, i) => (
                <text key={`lb_${i}`} x={lb.x} y={-lb.y} fontSize={4.8} fill={labelFill} fontFamily="monospace">
                  {lb.text}
                </text>
              ))}
          </svg>
          <div className="absolute bottom-2 left-3 bg-slate-900/90 text-slate-200 px-3 py-1.5 rounded border border-slate-700 text-xs">
            <span className="font-semibold text-blue-400">{curveData.title}:</span> {curveData.summary}
          </div>
        </div>
      </div>
    );
  }

  // SCALES LAB (with exact visual reading marker!)
  const scaleWidth = 240;
  const scaleHeight = scaleMode === 'diagonal' ? 60 : 18;
  const majorW = scaleWidth / scaleInfo.majorDivisions;
  const subW = majorW / scaleInfo.subDivisions;

  // Compute exact marker positions for markReading (e.g. 4.37 m -> major=4, sub=3, diagRow=7)
  const unitPerMajor = maxMeters / scaleInfo.majorDivisions;
  const clampedReading = Math.max(0, Math.min(maxMeters, markReading));
  const totalMajorUnits = clampedReading / Math.max(1e-6, unitPerMajor);
  const majorInt = Math.min(scaleInfo.majorDivisions - 1, Math.floor(totalMajorUnits + 1e-9));
  const remAfterMajor = totalMajorUnits - majorInt;
  const subFloat = remAfterMajor * scaleInfo.subDivisions;
  const subInt = Math.min(scaleInfo.subDivisions - 1, Math.floor(subFloat + 1e-9));
  const rowInt =
    scaleMode === 'diagonal'
      ? Math.min(scaleInfo.diagonalRows, Math.round((subFloat - subInt) * scaleInfo.diagonalRows))
      : 0;

  // In N.D. Bhatt diagonal scale: 0 is at x = majorW. Major marks go right (majorW * (1 + majorInt)).
  // Sub-divisions go LEFT from 0 (x = majorW - subInt * subW), sloping further left by (rowInt/diagRows)*subW!
  const markRightX = majorW * (1 + majorInt);
  const markLeftX = majorW - (subInt + (scaleMode === 'diagonal' ? rowInt / scaleInfo.diagonalRows : 0)) * subW;
  const markY = scaleMode === 'diagonal' ? scaleHeight - (rowInt / scaleInfo.diagonalRows) * scaleHeight : scaleHeight / 2;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs">
        <select
          value={scaleMode}
          onChange={(e) => setScaleMode(e.target.value as EngineeringScaleMode)}
          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
        >
          <option value="plain">Plain Scale</option>
          <option value="diagonal">Diagonal Scale</option>
          <option value="chords">Scale of Chords (5° divisions)</option>
        </select>

        {scaleMode !== 'chords' ? (
          <>
            <label className="flex items-center gap-1">
              <span>R.F.</span>
              <input type="number" value={rfNum} onChange={(e) => setRfNum(Number(e.target.value) || 1)} className="w-12 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              <span>:</span>
              <input type="number" value={rfDen} onChange={(e) => setRfDen(Number(e.target.value) || 100)} className="w-16 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
            </label>
            <label className="flex items-center gap-1">
              <span>Max(m)</span>
              <input type="number" value={maxMeters} onChange={(e) => setMaxMeters(Number(e.target.value) || 6)} className="w-14 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
            </label>
            <label className="flex items-center gap-1">
              <span>Major</span>
              <input type="number" min={2} max={12} value={majorDivs} onChange={(e) => setMajorDivs(Number(e.target.value) || 6)} className="w-12 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
            </label>
            <label className="flex items-center gap-1">
              <span>Sub</span>
              <input type="number" min={2} max={12} value={subDivs} onChange={(e) => setSubDivs(Number(e.target.value) || 10)} className="w-12 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
            </label>
            {scaleMode === 'diagonal' && (
              <label className="flex items-center gap-1">
                <span>Rows</span>
                <input type="number" min={2} max={12} value={diagRows} onChange={(e) => setDiagRows(Number(e.target.value) || 10)} className="w-12 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
            )}
            <label className="flex items-center gap-1">
              <span>Mark</span>
              <input type="number" step="0.01" value={markReading} onChange={(e) => setMarkReading(Number(e.target.value) || 0)} className="w-16 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
            </label>
          </>
        ) : (
          <label className="flex items-center gap-1">
            <span>Set-off Angle (°)</span>
            <input type="number" min={5} max={150} value={chordAngle} onChange={(e) => setChordAngle(Number(e.target.value) || 45)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
          </label>
        )}
      </div>

      <div className={`flex-1 min-h-0 relative ${theme === 'dark' ? 'cad-grid-dark' : 'cad-grid-light'}`}>
        {scaleMode !== 'chords' ? (
          <svg viewBox="-25 -35 300 135" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Outer scale box */}
            <rect x={0} y={0} width={scaleWidth} height={scaleHeight} fill="none" stroke="#3b82f6" strokeWidth={1.2} />
            {/* Major divisions */}
            {Array.from({ length: scaleInfo.majorDivisions + 1 }, (_, i) => (
              <g key={`m_${i}`}>
                <line x1={i * majorW} y1={0} x2={i * majorW} y2={scaleHeight} stroke={strokeMain} strokeWidth={0.8} />
                <text x={i * majorW} y={scaleHeight + 8} textAnchor="middle" fontSize={5} fill={labelFill} fontFamily="monospace">
                  {i === 0 ? subDivs : i - 1}
                </text>
              </g>
            ))}
            {/* Sub-divisions in first block (0..majorW) */}
            {Array.from({ length: scaleInfo.subDivisions }, (_, j) => {
              const xTop = j * subW;
              const xBot = scaleMode === 'diagonal' ? (j + 1) * subW : j * subW;
              return (
                <line
                  key={`s_${j}`}
                  x1={xBot}
                  y1={scaleHeight}
                  x2={xTop}
                  y2={0}
                  stroke="#38bdf8"
                  strokeWidth={0.55}
                />
              );
            })}
            {/* Diagonal horizontal rows */}
            {scaleMode === 'diagonal' &&
              Array.from({ length: scaleInfo.diagonalRows + 1 }, (_, r) => {
                const y = scaleHeight - (r / scaleInfo.diagonalRows) * scaleHeight;
                return (
                  <g key={`r_${r}`}>
                    <line x1={0} y1={y} x2={scaleWidth} y2={y} stroke="#64748b" strokeWidth={0.45} />
                    <text x={-5} y={y + 1.5} textAnchor="end" fontSize={4} fill="#94a3b8" fontFamily="monospace">
                      {r}
                    </text>
                  </g>
                );
              })}

            {/* Highlighted Reading Marker (Exact!) */}
            {clampedReading > 0 && (
              <g>
                <line x1={markLeftX} y1={markY} x2={markRightX} y2={markY} stroke="#ef4444" strokeWidth={1.6} />
                <circle cx={markLeftX} cy={markY} r={1.8} fill="#ef4444" />
                <circle cx={markRightX} cy={markY} r={1.8} fill="#ef4444" />
                <line x1={markLeftX} y1={markY} x2={markLeftX} y2={-9} stroke="#ef4444" strokeWidth={0.6} strokeDasharray="2 1.5" />
                <line x1={markRightX} y1={markY} x2={markRightX} y2={-9} stroke="#ef4444" strokeWidth={0.6} strokeDasharray="2 1.5" />
                <line x1={markLeftX} y1={-7} x2={markRightX} y2={-7} stroke="#ef4444" strokeWidth={1.1} />
                <text x={(markLeftX + markRightX) / 2} y={-10} textAnchor="middle" fontSize={4.8} fill="#ef4444" fontFamily="monospace" fontWeight="700">
                  {clampedReading.toFixed(2)} m
                </text>
              </g>
            )}

            {/* Title */}
            <text x={scaleWidth / 2} y={-22} textAnchor="middle" fontSize={5.8} fill="#f59e0b" fontFamily="monospace" fontWeight="700">
              {scaleMode.toUpperCase()} SCALE | R.F. = {scaleInfo.rfDisplay} | LOS = {scaleInfo.lengthOfScaleCm.toFixed(2)} cm
            </text>
          </svg>
        ) : (
          <svg viewBox="-20 -110 220 140" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <path d="M 0 0 L 80 0 A 80 80 0 0 0 0 -80 Z" fill="none" stroke="#64748b" strokeWidth={0.8} strokeDasharray="3 2" />
            <line x1={0} y1={0} x2={150} y2={0} stroke="#3b82f6" strokeWidth={1.3} />
            {Array.from({ length: 19 }, (_, i) => {
              const deg = i * 5;
              const chordLen = 2 * 80 * Math.sin(((deg / 2) * Math.PI) / 180);
              return (
                <g key={`ch_${deg}`}>
                  <line x1={chordLen} y1={0} x2={chordLen} y2={deg % 15 === 0 ? 6 : 3} stroke={strokeMain} strokeWidth={0.7} />
                  {deg % 15 === 0 && (
                    <text x={chordLen} y={12} textAnchor="middle" fontSize={4.2} fill={labelFill} fontFamily="monospace">
                      {deg}°
                    </text>
                  )}
                </g>
              );
            })}
            <line
              x1={0}
              y1={-12}
              x2={2 * 80 * Math.sin(((Math.min(90, chordAngle) / 2) * Math.PI) / 180)}
              y2={-12}
              stroke="#10b981"
              strokeWidth={1.6}
            />
            <text x={75} y={-95} textAnchor="middle" fontSize={5.5} fill="#f59e0b" fontFamily="monospace">
              SCALE OF CHORDS (5° Divisions) — Chord({chordAngle}°) = {(2 * 80 * Math.sin(((Math.min(90, chordAngle) / 2) * Math.PI) / 180)).toFixed(1)} mm (R=80)
            </text>
          </svg>
        )}
      </div>
    </div>
  );
};

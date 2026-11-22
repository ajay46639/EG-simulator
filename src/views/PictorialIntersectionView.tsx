import React, { useMemo, useState } from 'react';
import { EngineeringObject, MeshData } from '../types/engineering';
import { buildIsometricView, IsometricMode } from '../core/pictorial/isometric';
import { buildObliqueView, ObliqueMode } from '../core/pictorial/oblique';
import { buildPerspectiveView } from '../core/pictorial/perspective';
import {
  computeSolidIntersection,
  IntersectionPairType,
} from '../core/intersection/intersectionEngine';

interface PictorialIntersectionViewProps {
  mode: 'pictorial' | 'intersect';
  selectedObj: EngineeringObject | null;
  selectedMesh: MeshData | null;
  theme: 'dark' | 'light';
}

export const PictorialIntersectionView: React.FC<PictorialIntersectionViewProps> = ({
  mode,
  selectedObj,
  selectedMesh,
  theme,
}) => {
  // Pictorial state
  const [picType, setPicType] = useState<'isometric' | 'oblique' | 'perspective'>('isometric');
  const [isoMode, setIsoMode] = useState<IsometricMode>('projection');
  const [obliqueMode, setObliqueMode] = useState<ObliqueMode>('cabinet');
  const [obliqueAngle, setObliqueAngle] = useState(45);
  const [spDist, setSpDist] = useState(160);
  const [eyeHeight, setEyeHeight] = useState(85);
  const [yawDeg, setYawDeg] = useState(30);
  const [showHidden, setShowHidden] = useState(true);

  // Intersection state
  const [pairType, setPairType] = useState<IntersectionPairType>('cylinder_cylinder');
  const [mainR, setMainR] = useState(40);
  const [mainH, setMainH] = useState(100);
  const [penR, setPenR] = useState(25);
  const [axisOffset, setAxisOffset] = useState(6);
  const [penHeight, setPenHeight] = useState(50);

  const picOutput = useMemo(() => {
    if (mode !== 'pictorial' || !selectedMesh || !selectedObj) return null;
    if (picType === 'isometric') return buildIsometricView(selectedMesh, isoMode, selectedObj.name);
    if (picType === 'oblique') return buildObliqueView(selectedMesh, obliqueMode, obliqueAngle, selectedObj.name);
    return buildPerspectiveView(
      selectedMesh,
      { stationDistFromPP: spDist, eyeHeightAboveGP: eyeHeight, stationOffsetX: 0, objectYawDeg: yawDeg },
      selectedObj.name
    );
  }, [mode, selectedMesh, selectedObj, picType, isoMode, obliqueMode, obliqueAngle, spDist, eyeHeight, yawDeg]);

  const interOutput = useMemo(() => {
    if (mode !== 'intersect') return null;
    return computeSolidIntersection({
      pairType,
      mainRadius: mainR,
      mainHeight: mainH,
      penRadius: penR,
      penLength: mainR * 3.2,
      axisOffset,
      penHeight,
    });
  }, [mode, pairType, mainR, mainH, penR, axisOffset, penHeight]);

  const visibleStroke = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const hiddenStroke = theme === 'dark' ? '#64748b' : '#94a3b8';

  if (mode === 'pictorial') {
    if (!picOutput) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          Select an object in the Object Explorer to generate Isometric, Oblique, or Perspective views.
        </div>
      );
    }
    const pad = 28;
    const minX = picOutput.bounds.minU - pad;
    const w = Math.max(120, picOutput.bounds.maxU - picOutput.bounds.minU + pad * 2);
    const minY = -picOutput.bounds.maxV - pad;
    const h = Math.max(100, picOutput.bounds.maxV - picOutput.bounds.minV + pad * 2);

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs">
          <select
            value={picType}
            onChange={(e) => setPicType(e.target.value as any)}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
          >
            <option value="isometric">Isometric (Ch. 17)</option>
            <option value="oblique">Oblique (Ch. 18)</option>
            <option value="perspective">Perspective (Ch. 19)</option>
          </select>

          {picType === 'isometric' && (
            <select
              value={isoMode}
              onChange={(e) => setIsoMode(e.target.value as IsometricMode)}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            >
              <option value="projection">Isometric Projection (×0.8165)</option>
              <option value="drawing">Isometric Drawing (True 1:1)</option>
            </select>
          )}

          {picType === 'oblique' && (
            <>
              <select
                value={obliqueMode}
                onChange={(e) => setObliqueMode(e.target.value as ObliqueMode)}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              >
                <option value="cabinet">Cabinet (Half Depth 0.5)</option>
                <option value="cavalier">Cavalier (Full Depth 1.0)</option>
              </select>
              <select
                value={obliqueAngle}
                onChange={(e) => setObliqueAngle(Number(e.target.value))}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
              >
                <option value={30}>30°</option>
                <option value={45}>45°</option>
                <option value={60}>60°</option>
              </select>
            </>
          )}

          {picType === 'perspective' && (
            <>
              <label className="flex items-center gap-1">
                <span>Station D</span>
                <input type="number" value={spDist} onChange={(e) => setSpDist(Number(e.target.value) || 160)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              <label className="flex items-center gap-1">
                <span>Eye H</span>
                <input type="number" value={eyeHeight} onChange={(e) => setEyeHeight(Number(e.target.value) || 85)} className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
              <label className="flex items-center gap-1">
                <span>Yaw° (0=1pt, 30=2pt)</span>
                <input type="number" value={yawDeg} onChange={(e) => setYawDeg(Number(e.target.value) || 0)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
              </label>
            </>
          )}

          <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-blue-600" />
            <span>Hidden Edges</span>
          </label>
        </div>

        <div className={`flex-1 min-h-0 relative ${theme === 'dark' ? 'cad-grid-dark' : 'cad-grid-light'}`}>
          <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {picOutput.axes.map((ax, i) => (
              <g key={`ax_${i}`}>
                <line x1={ax.from.u} y1={-ax.from.v} x2={ax.to.u} y2={-ax.to.v} stroke={ax.color} strokeWidth={0.8} strokeDasharray="3 2" />
                <text x={ax.to.u + 2} y={-ax.to.v} fontSize={4} fill={ax.color} fontFamily="monospace">
                  {ax.label}
                </text>
              </g>
            ))}
            {picOutput.edges.map((e, i) => {
              if (e.kind === 'hidden' && !showHidden) return null;
              return (
                <line
                  key={`pe_${i}`}
                  x1={e.start.u}
                  y1={-e.start.v}
                  x2={e.end.u}
                  y2={-e.end.v}
                  stroke={e.kind === 'axis' ? '#f59e0b' : e.kind === 'hidden' ? hiddenStroke : selectedObj?.color || visibleStroke}
                  strokeWidth={e.kind === 'visible' ? 1.4 : 0.8}
                  strokeDasharray={e.kind === 'hidden' ? '2.5 2' : e.kind === 'axis' ? '5 1.5 1.5 1.5' : undefined}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute bottom-2 left-3 bg-slate-900/90 text-slate-200 px-3 py-1.5 rounded border border-slate-700 text-xs">
            <span className="font-semibold text-blue-400">{picOutput.title}:</span> {picOutput.subtitle}
          </div>
        </div>
      </div>
    );
  }

  // INTERSECTION OF SOLIDS LAB (Ch. 16)
  if (!interOutput) return null;
  const pad = 20;
  const minX = interOutput.boundsFV.minU - pad;
  const w = interOutput.boundsFV.maxU - interOutput.boundsFV.minU + pad * 2;
  const minY = -interOutput.boundsFV.maxV - pad;
  const h = interOutput.boundsFV.maxV - interOutput.boundsFV.minV + pad * 2;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs">
        <select
          value={pairType}
          onChange={(e) => setPairType(e.target.value as IntersectionPairType)}
          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium"
        >
          <option value="cylinder_cylinder">Cylinder ∩ Cylinder (W16-8..11)</option>
          <option value="prism_prism">Square Prism ∩ Square Prism (W16-1..3)</option>
          <option value="cone_cylinder">Cone ∩ Horizontal Cylinder (W16-22..26)</option>
          <option value="sphere_cylinder">Sphere ∩ Horizontal Cylinder (E16.19)</option>
        </select>

        <label className="flex items-center gap-1">
          <span>Main R</span>
          <input type="number" value={mainR} onChange={(e) => setMainR(Number(e.target.value) || 40)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>Main H</span>
          <input type="number" value={mainH} onChange={(e) => setMainH(Number(e.target.value) || 100)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>Pen r</span>
          <input type="number" value={penR} onChange={(e) => setPenR(Number(e.target.value) || 25)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>Offset e</span>
          <input type="number" value={axisOffset} onChange={(e) => setAxisOffset(Number(e.target.value) || 0)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>Height z0</span>
          <input type="number" value={penHeight} onChange={(e) => setPenHeight(Number(e.target.value) || 50)} className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono" />
        </label>
      </div>

      <div className={`flex-1 min-h-0 relative ${theme === 'dark' ? 'cad-grid-dark' : 'cad-grid-light'}`}>
        <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <line x1={minX} y1={0} x2={minX + w} y2={0} stroke="#f59e0b" strokeWidth={0.9} />
          {interOutput.mainOutlineFV.map(([a, b], i) => (
            <line key={`m_${i}`} x1={a.u} y1={-a.v} x2={b.u} y2={-b.v} stroke={visibleStroke} strokeWidth={1.2} />
          ))}
          {interOutput.penOutlineFV.map(([a, b], i) => (
            <line key={`p_${i}`} x1={a.u} y1={-a.v} x2={b.u} y2={-b.v} stroke="#38bdf8" strokeWidth={1.1} />
          ))}
          {interOutput.fvCurves.map((curve, idx) => (
            <polyline
              key={`ic_${idx}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth={1.8}
              points={curve.map((pt) => `${pt.u},${-pt.v}`).join(' ')}
            />
          ))}
        </svg>
        <div className="absolute bottom-2 left-3 bg-slate-900/90 text-slate-200 px-3 py-1.5 rounded border border-slate-700 text-xs">
          <span className="font-semibold text-red-400">{interOutput.title}:</span> {interOutput.summary}
        </div>
      </div>
    </div>
  );
};

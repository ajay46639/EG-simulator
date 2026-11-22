import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { useProjectStore } from '../state/useProjectStore';
import {
  AngleUnit,
  ApexOrientation,
  CurveType,
  EngineeringObject,
  HelperLineVisibility,
  InputMode,
  LengthUnit,
  LineAnchorType,
  LineCase,
  PlaneRestingOn,
  PlaneShape,
  PlaneStage3Ref,
  Quadrant,
  SectionPlaneType,
  SolidBaseOrientation,
  SolidRestingOn,
  SolidStage3Ref,
  SolidType,
  SolverResult,
} from '../types/engineering';
import { formatNum, fromDeg, fromMM, toDeg, toMM } from '../engineering/units';

interface RightSidebarProps {
  selectedObj: EngineeringObject | null;
  solved: SolverResult | null;
}

const NumField: React.FC<{
  label: string;
  valueMM: number | null | undefined;
  unit: string;
  isAngle?: boolean;
  lengthUnit: LengthUnit;
  angleUnit: AngleUnit;
  onChangeMM: (val: number | null) => void;
}> = ({ label, valueMM, unit, isAngle, lengthUnit, angleUnit, onChangeMM }) => {
  const displayVal =
    valueMM === null || valueMM === undefined
      ? ''
      : isAngle
        ? Number(fromDeg(valueMM, angleUnit).toFixed(3))
        : Number(fromMM(valueMM, lengthUnit).toFixed(3));

  return (
    <label className="flex flex-col gap-0.5 text-[11px]">
      <span className="text-slate-500 dark:text-slate-400 flex justify-between">
        <span className="truncate">{label}</span>
        <span className="font-mono opacity-75">{unit}</span>
      </span>
      <input
        type="number"
        step="any"
        value={displayVal}
        placeholder="auto"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChangeMM(null);
            return;
          }
          const num = Number(raw);
          if (!Number.isFinite(num)) return;
          onChangeMM(isAngle ? toDeg(num, angleUnit) : toMM(num, lengthUnit));
        }}
        className="w-full px-2 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100"
      />
    </label>
  );
};

export const RightSidebar: React.FC<RightSidebarProps> = ({ selectedObj, solved }) => {
  const {
    lengthUnit,
    angleUnit,
    inputMode,
    setLengthUnit,
    setAngleUnit,
    setInputMode,
    updateObject,
    selectedAltIndex,
    setSelectedAltIndex,
    projectionSettings,
    updateProjectionSettings,
    updateHelperVisibility,
  } = useProjectStore();

  const modes: Array<{ id: InputMode; label: string }> = [
    { id: 'parameter', label: 'Param' },
    { id: 'coordinate', label: 'XYZ' },
    { id: 'projection', label: 'Proj' },
    { id: 'mixed', label: 'Mixed' },
  ];

  const patchData = (patch: Record<string, unknown>) => {
    if (!selectedObj) return;
    updateObject(selectedObj.id, (o) => ({
      ...o,
      params: { ...o.params, data: { ...(o.params.data as any), ...patch } } as any,
    }));
  };

  const resetFields = () => {
    if (!selectedObj) return;
    if (selectedObj.params.category === 'point') {
      patchData({ x: null, y: null, z: null, distHP: null, distVP: null, distXY: null, quadrant: null });
    } else if (selectedObj.params.category === 'line') {
      patchData({
        trueLength: null, theta: null, phi: null, fvLength: null, tvLength: null,
        alpha: null, beta: null, projectorDist: null,
        x2: null, y2: null, z2: null, h1: null, d1: null, h2: null, d2: null,
        quadrantA: null, quadrantB: null,
      });
    }
  };

  const h = projectionSettings.helpers;
  const selectCls =
    'px-1.5 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none text-slate-900 dark:text-slate-100';

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
      {/* Units & Mode */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Units & Mode
          </span>
          <div className="flex items-center gap-1">
            <select
              value={lengthUnit}
              onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none"
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="in">in</option>
            </select>
            <select
              value={angleUnit}
              onChange={(e) => setAngleUnit(e.target.value as AngleUnit)}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none"
            >
              <option value="deg">deg (°)</option>
              <option value="rad">rad</option>
            </select>
            <select
              value={projectionSettings.scaleLabel ?? '1:1'}
              onChange={(e) => {
                const label = e.target.value;
                const parts = label.split(':').map(Number);
                const ratio = parts.length === 2 && parts[1] ? parts[0] / parts[1] : 1;
                updateProjectionSettings({ scaleLabel: label, scaleRatio: ratio });
              }}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 outline-none"
              title="Global Drawing Scale"
            >
              <option value="1:1">1:1</option>
              <option value="1:2">1:2</option>
              <option value="1:10">1:10</option>
              <option value="1:50">1:50</option>
              <option value="1:100">1:100</option>
              <option value="1:250">1:250</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setInputMode(m.id)}
              className={`py-1 rounded text-[11px] font-medium transition-colors ${inputMode === m.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Object Parameters */}
      {selectedObj ? (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={selectedObj.name}
              onChange={(e) => updateObject(selectedObj.id, (o) => ({ ...o, name: e.target.value }))}
              className="text-xs font-semibold bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-slate-900 dark:text-white w-48"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={selectedObj.color}
                onChange={(e) => updateObject(selectedObj.id, (o) => ({ ...o, color: e.target.value }))}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
              />
              {(selectedObj.category === 'point' || selectedObj.category === 'line') && (
                <button onClick={resetFields} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400" title="Clear Fields">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* POINT INPUTS */}
          {selectedObj.params.category === 'point' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <NumField label="X" valueMM={selectedObj.params.data.x} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ x: v })} />
                <NumField label="Y (from VP)" valueMM={selectedObj.params.data.y} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ y: v })} />
                <NumField label="Z (from HP)" valueMM={selectedObj.params.data.z} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ z: v })} />
                <NumField label="Dist from HP" valueMM={selectedObj.params.data.distHP} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ distHP: v })} />
                <NumField label="Dist from VP" valueMM={selectedObj.params.data.distVP} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ distVP: v })} />
                <NumField label="Dist from XY" valueMM={selectedObj.params.data.distXY} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ distXY: v })} />
              </div>
              <label className="flex flex-col gap-0.5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Quadrant / Plane</span>
                <select
                  value={selectedObj.params.data.quadrant ?? ''}
                  onChange={(e) => patchData({ quadrant: (e.target.value || null) as Quadrant | null })}
                  className={selectCls}
                >
                  <option value="">Auto (Show All 4 Quadrants)</option>
                  <option value="I">I (Above HP, In front of VP)</option>
                  <option value="II">II (Above HP, Behind VP)</option>
                  <option value="III">III (Below HP, Behind VP)</option>
                  <option value="IV">IV (Below HP, In front of VP)</option>
                  <option value="HP">On HP (Z = 0)</option>
                  <option value="VP">On VP (Y = 0)</option>
                  <option value="XY">On XY Line</option>
                </select>
              </label>
            </div>
          )}

          {/* STRAIGHT LINE INPUTS (Complete N.D. Bhatt Ch. 10) */}
          {selectedObj.params.category === 'line' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Anchor Point</span>
                  <select
                    value={selectedObj.params.data.anchorType ?? 'endA'}
                    onChange={(e) => patchData({ anchorType: e.target.value as LineAnchorType })}
                    className={selectCls}
                  >
                    <option value="endA">End A (P1)</option>
                    <option value="endB">End B (P2)</option>
                    <option value="midpoint">Midpoint (M)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Line Orientation</span>
                  <select
                    value={selectedObj.params.data.lineCase ?? ''}
                    onChange={(e) => patchData({ lineCase: (e.target.value || null) as LineCase | null })}
                    className={selectCls}
                  >
                    <option value="">Auto / Custom</option>
                    <option value="parallel_hp_vp">∥ HP & VP</option>
                    <option value="parallel_hp_inclined_vp">∥ HP, ∠ VP</option>
                    <option value="parallel_vp_inclined_hp">∥ VP, ∠ HP</option>
                    <option value="inclined_both">∠ Both HP & VP</option>
                    <option value="profile_plane">Profile Plane (θ+φ=90°)</option>
                    <option value="perpendicular_hp">⊥ HP</option>
                    <option value="perpendicular_vp">⊥ VP</option>
                    <option value="contained_hp">Contained in HP</option>
                    <option value="contained_vp">Contained in VP</option>
                    <option value="contained_xy">Contained in XY</option>
                    <option value="perpendicular_both">⊥ Both (Test Error)</option>
                  </select>
                </label>
              </div>

              {selectedObj.params.data.anchorType !== 'midpoint' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="flex flex-col gap-0.5 text-[11px]">
                    <span className="text-slate-500">End A Quadrant</span>
                    <select
                      value={selectedObj.params.data.quadrantA ?? ''}
                      onChange={(e) => patchData({ quadrantA: (e.target.value || null) as Quadrant | null })}
                      className={selectCls}
                    >
                      <option value="">Signed Y,Z</option>
                      <option value="I">Q-I (+Y,+Z)</option>
                      <option value="II">Q-II (-Y,+Z)</option>
                      <option value="III">Q-III (-Y,-Z)</option>
                      <option value="IV">Q-IV (+Y,-Z)</option>
                      <option value="HP">On HP</option>
                      <option value="VP">On VP</option>
                      <option value="XY">On XY</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5 text-[11px]">
                    <span className="text-slate-500">End B Quadrant</span>
                    <select
                      value={selectedObj.params.data.quadrantB ?? ''}
                      onChange={(e) => patchData({ quadrantB: (e.target.value || null) as Quadrant | null })}
                      className={selectCls}
                    >
                      <option value="">Signed Y,Z</option>
                      <option value="I">Q-I (+Y,+Z)</option>
                      <option value="II">Q-II (-Y,+Z)</option>
                      <option value="III">Q-III (-Y,-Z)</option>
                      <option value="IV">Q-IV (+Y,-Z)</option>
                      <option value="HP">On HP</option>
                      <option value="VP">On VP</option>
                      <option value="XY">On XY</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <NumField label="True Length (L)" valueMM={selectedObj.params.data.trueLength} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ trueLength: v })} />
                <NumField label="Proj Dist (DEP)" valueMM={selectedObj.params.data.projectorDist} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ projectorDist: v })} />
                <NumField label="θ (with HP)" valueMM={selectedObj.params.data.theta} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ theta: v })} />
                <NumField label="φ (with VP)" valueMM={selectedObj.params.data.phi} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ phi: v })} />

                {(inputMode === 'projection' || inputMode === 'mixed') && (
                  <>
                    <NumField label="FV Length" valueMM={selectedObj.params.data.fvLength} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ fvLength: v })} />
                    <NumField label="TV Length" valueMM={selectedObj.params.data.tvLength} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ tvLength: v })} />
                    <NumField label="FV Angle α" valueMM={selectedObj.params.data.alpha} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ alpha: v })} />
                    <NumField label="TV Angle β" valueMM={selectedObj.params.data.beta} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ beta: v })} />
                    <NumField label="H.T. Dist VP" valueMM={selectedObj.params.data.htDistVP} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ htDistVP: v })} />
                    <NumField label="V.T. Dist HP" valueMM={selectedObj.params.data.vtDistHP} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ vtDistHP: v })} />
                    <NumField label="Trace Proj Dist" valueMM={selectedObj.params.data.traceProjectorDist} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ traceProjectorDist: v })} />
                  </>
                )}

                {selectedObj.params.data.anchorType === 'midpoint' ? (
                  <>
                    <NumField label="Midpoint Y (VP)" valueMM={selectedObj.params.data.midY} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ midY: v })} />
                    <NumField label="Midpoint Z (HP)" valueMM={selectedObj.params.data.midZ} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ midZ: v })} />
                  </>
                ) : (
                  <>
                    <NumField label="A: Y / Dist VP" valueMM={selectedObj.params.data.y1 ?? selectedObj.params.data.d1} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData((selectedObj.params.data as any).quadrantA ? { d1: v, y1: null } : { y1: v, d1: null })} />
                    <NumField label="A: Z / Dist HP" valueMM={selectedObj.params.data.z1 ?? selectedObj.params.data.h1} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData((selectedObj.params.data as any).quadrantA ? { h1: v, z1: null } : { z1: v, h1: null })} />
                    <NumField label="B: Y / Dist VP" valueMM={selectedObj.params.data.y2 ?? selectedObj.params.data.d2} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData((selectedObj.params.data as any).quadrantB ? { d2: v, y2: null } : { y2: v, d2: null })} />
                    <NumField label="B: Z / Dist HP" valueMM={selectedObj.params.data.z2 ?? selectedObj.params.data.h2} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData((selectedObj.params.data as any).quadrantB ? { h2: v, z2: null } : { z2: v, h2: null })} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* PLANE INPUTS (Complete N.D. Bhatt Ch. 12) */}
          {selectedObj.params.category === 'plane' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Lamina Shape</span>
                  <select
                    value={selectedObj.params.data.shape}
                    onChange={(e) => patchData({ shape: e.target.value as PlaneShape })}
                    className={selectCls}
                  >
                    <option value="square">Square</option>
                    <option value="rectangle">Rectangle</option>
                    <option value="rhombus">Rhombus (D1×D2)</option>
                    <option value="trapezium">Trapezium</option>
                    <option value="composite_rect_semicircle">Rect + Semicircle</option>
                    <option value="equilateral_triangle">Equilateral Triangle</option>
                    <option value="isosceles_triangle">Isosceles Triangle</option>
                    <option value="right_triangle">Right Triangle</option>
                    <option value="set_square_30_60">30°-60° Set-Square</option>
                    <option value="set_square_45">45° Set-Square</option>
                    <option value="regular_pentagon">Regular Pentagon</option>
                    <option value="regular_hexagon">Regular Hexagon</option>
                    <option value="circle">Circle</option>
                    <option value="semicircle">Semicircle</option>
                    <option value="circular_plate_hole">Circular Plate w/ Hole</option>
                    <option value="polygon">Custom N-Polygon</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Resting Condition</span>
                  <select
                    value={selectedObj.params.data.restingOn ?? 'hp_edge'}
                    onChange={(e) => patchData({ restingOn: e.target.value as PlaneRestingOn })}
                    className={selectCls}
                  >
                    <option value="hp_edge">Edge in HP</option>
                    <option value="hp_corner">Corner in HP</option>
                    <option value="hp_diameter">Diameter in HP</option>
                    <option value="vp_edge">Edge in VP</option>
                    <option value="vp_corner">Corner in VP</option>
                    <option value="vp_diameter">Diameter in VP</option>
                    <option value="free">Free in Space</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Side / Width / D1" valueMM={selectedObj.params.data.width} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ width: v })} />
                <NumField label="Length / Alt / D2" valueMM={selectedObj.params.data.length} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ length: v })} />
                <NumField label="Radius" valueMM={selectedObj.params.data.radius} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ radius: v })} />
                {selectedObj.params.data.shape === 'circular_plate_hole' && (
                  <NumField label="Hole Radius" valueMM={selectedObj.params.data.holeRadius} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ holeRadius: v })} />
                )}
                <NumField label="Stage 2 θ (HP)" valueMM={selectedObj.params.data.theta} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ theta: v })} />
                <NumField label="Stage 2 φ (VP)" valueMM={selectedObj.params.data.phi} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ phi: v })} />
                <NumField label="Stage 3 Angle" valueMM={selectedObj.params.data.stage3Angle} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ stage3Angle: v })} />
                {(selectedObj.params.data.shape === 'rectangle' || selectedObj.params.data.shape === 'rhombus' || selectedObj.params.data.shape === 'circle') && (
                  <NumField label="Apparent Width" valueMM={selectedObj.params.data.apparentSquareSide} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ apparentSquareSide: v })} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Stage 3 Element</span>
                  <select
                    value={selectedObj.params.data.stage3Ref ?? 'resting_edge'}
                    onChange={(e) => patchData({ stage3Ref: e.target.value as PlaneStage3Ref })}
                    className={selectCls}
                  >
                    <option value="resting_edge">Resting Edge</option>
                    <option value="diagonal_or_median">Diagonal / Median</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Stage 3 Angle Type</span>
                  <select
                    value={selectedObj.params.data.stage3IsApparent === false ? 'true' : 'apparent'}
                    onChange={(e) => patchData({ stage3IsApparent: e.target.value !== 'true' })}
                    className={selectCls}
                  >
                    <option value="apparent">Apparent (β / α)</option>
                    <option value="true">True Angle (Locus)</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* SOLID INPUTS (Complete N.D. Bhatt Ch. 13, 14 & 15) */}
          {selectedObj.params.category === 'solid' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Solid Type</span>
                  <select
                    value={selectedObj.params.data.solidType}
                    onChange={(e) => patchData({ solidType: e.target.value as SolidType })}
                    className={selectCls}
                  >
                    <option value="tetrahedron">Tetrahedron</option>
                    <option value="cube">Cube (Hexahedron)</option>
                    <option value="cuboid">Cuboid (Rect Prism)</option>
                    <option value="octahedron">Octahedron</option>
                    <option value="triangular_prism">Triangular Prism</option>
                    <option value="square_prism">Square Prism</option>
                    <option value="pentagonal_prism">Pentagonal Prism</option>
                    <option value="hexagonal_prism">Hexagonal Prism</option>
                    <option value="hollow_prism">Hollow Prism</option>
                    <option value="triangular_pyramid">Triangular Pyramid</option>
                    <option value="square_pyramid">Square Pyramid</option>
                    <option value="pentagonal_pyramid">Pentagonal Pyramid</option>
                    <option value="hexagonal_pyramid">Hexagonal Pyramid</option>
                    <option value="cylinder">Right Circular Cylinder</option>
                    <option value="hollow_cylinder">Hollow Cylinder</option>
                    <option value="cone">Right Circular Cone</option>
                    <option value="frustum_cone">Frustum of Cone</option>
                    <option value="frustum_pyramid">Frustum of Pyramid</option>
                    <option value="sphere">Sphere</option>
                    <option value="hemisphere">Hemisphere</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Resting Position</span>
                  <select
                    value={selectedObj.params.data.restingOn ?? 'hp_base'}
                    onChange={(e) => patchData({ restingOn: e.target.value as SolidRestingOn })}
                    className={selectCls}
                  >
                    <option value="hp_base">Base on HP (Axis ⊥ HP)</option>
                    <option value="vp_base">Base on VP (Axis ⊥ VP)</option>
                    <option value="axis_parallel_both">Axis ∥ Both HP & VP</option>
                    <option value="hp_base_edge">Base Edge on HP</option>
                    <option value="hp_base_corner">Base Corner on HP</option>
                    <option value="hp_slant_face">Triangular Face on HP</option>
                    <option value="hp_slant_edge">Slant Edge on HP</option>
                    <option value="hp_rect_face">Rectangular Face on HP</option>
                    <option value="hp_longer_edge">Longer Edge on HP</option>
                    <option value="hp_generator">Generator on HP</option>
                    <option value="hp_freely_suspended">Freely Suspended (Corner)</option>
                    <option value="cube_solid_diagonal_vertical">Solid Diagonal ⊥ HP</option>
                    <option value="vp_base_edge">Base Edge in VP</option>
                    <option value="vp_base_corner">Base Corner in VP</option>
                    <option value="vp_slant_face">Triangular Face in VP</option>
                    <option value="vp_slant_edge">Slant Edge in VP</option>
                    <option value="vp_generator">Generator in VP</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Stage 1 Base Orient</span>
                  <select
                    value={selectedObj.params.data.baseOrientation ?? 'auto'}
                    onChange={(e) => patchData({ baseOrientation: e.target.value as SolidBaseOrientation })}
                    className={selectCls}
                  >
                    <option value="auto">Auto (per Resting Mode)</option>
                    <option value="edge_perp_vp">Base Edge ⊥ VP</option>
                    <option value="edge_parallel_vp">Base Edge ∥ VP</option>
                    <option value="equally_inclined">Equally Inclined</option>
                    <option value="corner_right">Corner at Right (+X)</option>
                    <option value="custom">Custom Angle</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Apex / Top Direction</span>
                  <select
                    value={selectedObj.params.data.apexOrientation ?? 'away_from_vp'}
                    onChange={(e) => patchData({ apexOrientation: e.target.value as ApexOrientation })}
                    className={selectCls}
                  >
                    <option value="away_from_vp">Away from VP (Front)</option>
                    <option value="towards_vp">Towards VP (Back)</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <NumField label="Base Edge (w)" valueMM={selectedObj.params.data.width} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ width: v })} />
                <NumField label="Axis Height (h)" valueMM={selectedObj.params.data.height} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ height: v })} />
                {(selectedObj.params.data.solidType === 'cylinder' ||
                  selectedObj.params.data.solidType === 'hollow_cylinder' ||
                  selectedObj.params.data.solidType === 'cone' ||
                  selectedObj.params.data.solidType === 'frustum_cone' ||
                  selectedObj.params.data.solidType === 'sphere' ||
                  selectedObj.params.data.solidType === 'hemisphere') && (
                    <NumField label="Base Radius (R)" valueMM={selectedObj.params.data.radius} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ radius: v })} />
                  )}
                {(selectedObj.params.data.solidType === 'hollow_cylinder' ||
                  selectedObj.params.data.solidType === 'hollow_prism') && (
                    <NumField label="Inner Radius" valueMM={selectedObj.params.data.innerRadius} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ innerRadius: v })} />
                  )}
                {(selectedObj.params.data.solidType === 'frustum_cone' ||
                  selectedObj.params.data.solidType === 'frustum_pyramid') && (
                    <NumField label="Top Radius" valueMM={selectedObj.params.data.topRadius} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ topRadius: v })} />
                  )}
                <NumField
                  label={((selectedObj.params.data as any).restingOn ?? '').startsWith('vp_') ? 'Stage 2 Axis φ (VP)' : 'Stage 2 Axis θ (HP)'}
                  valueMM={((selectedObj.params.data as any).restingOn ?? '').startsWith('vp_') ? selectedObj.params.data.phi : selectedObj.params.data.theta}
                  unit={angleUnit}
                  isAngle
                  lengthUnit={lengthUnit}
                  angleUnit={angleUnit}
                  onChangeMM={(v) => patchData(((selectedObj.params.data as any).restingOn ?? '').startsWith('vp_') ? { phi: v } : { theta: v })}
                />
                <NumField label="Stage 3 Angle" valueMM={selectedObj.params.data.stage3Angle} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ stage3Angle: v })} />
                <NumField label="Base Rotation" valueMM={selectedObj.params.data.baseEdgeAngle} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ baseEdgeAngle: v })} />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Stage 3 Reference</span>
                  <select
                    value={selectedObj.params.data.stage3Ref ?? 'axis'}
                    onChange={(e) => patchData({ stage3Ref: e.target.value as SolidStage3Ref })}
                    className={selectCls}
                  >
                    <option value="axis">Axis Inclination</option>
                    <option value="resting_edge">Resting Edge Angle</option>
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-slate-500">Stage 3 Mode</span>
                  <select
                    value={selectedObj.params.data.stage3IsApparent === false ? 'true' : 'apparent'}
                    onChange={(e) => patchData({ stage3IsApparent: e.target.value !== 'true' })}
                    className={selectCls}
                  >
                    <option value="apparent">Apparent (β / α)</option>
                    <option value="true">True Angle (Locus)</option>
                  </select>
                </label>
              </div>

              {/* Sectioning & Surface Development Controls (Ch. 14 & 15) */}
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-red-500 dark:text-red-400">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedObj.params.data.sectionEnabled)}
                      onChange={(e) => patchData({ sectionEnabled: e.target.checked })}
                      className="accent-red-500"
                    />
                    <span>Section Plane</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-600 dark:text-emerald-400">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedObj.params.data.showDevelopment)}
                      onChange={(e) => patchData({ showDevelopment: e.target.checked })}
                      className="accent-emerald-500"
                    />
                    <span>Development</span>
                  </label>
                </div>
                {selectedObj.params.data.sectionEnabled && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <label className="flex flex-col gap-0.5 text-[11px]">
                        <span className="text-slate-500">Section Plane Type</span>
                        <select
                          value={selectedObj.params.data.sectionPlaneType ?? 'aip'}
                          onChange={(e) => patchData({ sectionPlaneType: e.target.value as SectionPlaneType })}
                          className={selectCls}
                        >
                          <option value="aip">AIP (⊥ VP, ∠ HP)</option>
                          <option value="avp">AVP (⊥ HP, ∠ VP)</option>
                          <option value="horizontal">Horizontal (∥ HP)</option>
                          <option value="frontal">Frontal (∥ VP)</option>
                          <option value="profile">Profile (⊥ Both)</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-1.5 pt-4 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedObj.params.data.showTrueShape !== false}
                          onChange={(e) => patchData({ showTrueShape: e.target.checked })}
                          className="accent-red-500"
                        />
                        <span>True Shape</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumField label="Plane Angle" valueMM={selectedObj.params.data.sectionAngle ?? 45} unit={angleUnit} isAngle lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ sectionAngle: v })} />
                      <NumField label="Cut Height" valueMM={selectedObj.params.data.sectionHeight ?? 30} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ sectionHeight: v })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CURVE INPUTS */}
          {selectedObj.params.category === 'curve' && (
            <div className="space-y-2">
              <select
                value={selectedObj.params.data.curveType}
                onChange={(e) => patchData({ curveType: e.target.value as CurveType })}
                className={`w-full ${selectCls}`}
              >
                <option value="circle">Circle</option>
                <option value="arc">Arc</option>
                <option value="ellipse">Ellipse</option>
                <option value="helix">Helix</option>
                <option value="polygon">Polygon</option>
                <option value="polyline">Polyline</option>
                <option value="spline">Spline</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Radius" valueMM={selectedObj.params.data.radius} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ radius: v })} />
                <NumField label="Pitch" valueMM={selectedObj.params.data.pitch} unit={lengthUnit} lengthUnit={lengthUnit} angleUnit={angleUnit} onChangeMM={(v) => patchData({ pitch: v })} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
          Select or create an object to edit its parameters.
        </div>
      )}

      {/* Constraint Solver Results */}
      {solved && selectedObj && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div
            className={`p-2 rounded border text-xs flex items-start gap-2 ${solved.status === 'fully_determined'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : solved.status === 'underdetermined'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : solved.status === 'multiple_solutions'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}
          >
            {solved.status === 'fully_determined' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
            {solved.status === 'underdetermined' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            {solved.status === 'multiple_solutions' && <GitBranch className="w-4 h-4 shrink-0 mt-0.5" />}
            {solved.status === 'inconsistent' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              <div className="font-semibold capitalize">{solved.status.replace('_', ' ')}</div>
              <div className="text-[11px] opacity-90 mt-0.5">{solved.message}</div>
            </div>
          </div>

          {solved.alternatives.length > 1 && (
            <div className="space-y-1">
              {solved.alternatives.map((alt, idx) => (
                <button
                  key={alt.id}
                  onClick={() => setSelectedAltIndex(selectedObj.id, idx)}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] border ${(selectedAltIndex[selectedObj.id] ?? 0) === idx
                      ? 'bg-blue-600/20 border-blue-500 text-blue-500 dark:text-blue-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  <div className="font-medium">{alt.label}</div>
                  <div className="text-[10px] opacity-75 font-mono">{alt.description}</div>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
            {Object.entries(solved.calculated).map(([k, v]) => {
              if (v === null || v === undefined) return null;
              let formatted = '';
              if (typeof v === 'number') {
                const isAng =
                  k === 'theta' ||
                  k === 'phi' ||
                  k === 'alpha' ||
                  k === 'beta' ||
                  k === 'stage3Angle' ||
                  k === 'apparentStage3Angle' ||
                  k === 'semiVerticalAngle';
                formatted = isAng
                  ? `${formatNum(fromDeg(v, angleUnit), 2)}${angleUnit === 'deg' ? '°' : ' rad'}`
                  : `${formatNum(fromMM(v, lengthUnit), 2)} ${lengthUnit}`;
              } else if (typeof v === 'string') {
                formatted = v;
              } else if (typeof v === 'object' && 'x' in v) {
                formatted = `(${formatNum(fromMM(v.x, lengthUnit), 1)}, ${formatNum(fromMM(v.y, lengthUnit), 1)}, ${formatNum(fromMM(v.z, lengthUnit), 1)})`;
              }
              return (
                <div key={k} className="bg-slate-100 dark:bg-slate-800/70 px-1.5 py-1 rounded">
                  <div className="text-[9px] text-slate-500">{k}</div>
                  <div className="truncate">{formatted}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Helper Lines & Projection Display Settings */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1"><Sliders className="w-3.5 h-3.5" /> Helper Lines & Planes</span>
          <button
            onClick={() => updateHelperVisibility({ masterHelpers: !h.masterHelpers })}
            className="text-[10px] text-blue-500 hover:underline normal-case"
          >
            {h.masterHelpers ? 'Hide All' : 'Show All'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[11px]">
          {(
            [
              ['projectors', 'Projectors'],
              ['locusLines', 'Locus Lines'],
              ['constructionArcs', 'Rotation Arcs'],
              ['trueLengthLines', 'True Length'],
              ['traces', 'Traces (H.T./V.T.)'],
              ['centerAxisLines', 'Center / Axis'],
              ['hiddenEdges', 'Hidden Edges'],
              ['dimensions', 'Dimensions'],
              ['labels', 'Labels'],
              ['stageGuides', 'Stage Headers'],
            ] as Array<[keyof HelperLineVisibility, string]>
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={h.masterHelpers && h[key]}
                onChange={(e) => updateHelperVisibility({ [key]: e.target.checked, masterHelpers: true })}
                className="accent-blue-600"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={projectionSettings.showHP} onChange={(e) => updateProjectionSettings({ showHP: e.target.checked })} className="accent-sky-500" />
            <span>HP</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={projectionSettings.showVP} onChange={(e) => updateProjectionSettings({ showVP: e.target.checked })} className="accent-violet-500" />
            <span>VP</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={projectionSettings.showXY} onChange={(e) => updateProjectionSettings({ showXY: e.target.checked })} className="accent-amber-500" />
            <span>XY</span>
          </label>
        </div>
      </div>
    </aside>
  );
};

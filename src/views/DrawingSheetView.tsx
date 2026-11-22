import { forwardRef, useMemo } from 'react';
import {
  EngineeringObject,
  HelperLineVisibility,
  ProjectionSettings,
  SolverResult,
} from '../types/engineering';
import { buildMultiStageSheet, SheetArc, SheetLayer } from '../projections/multiStageSheet';
import { Eye, EyeOff } from 'lucide-react';

interface DrawingSheetViewProps {
  obj: EngineeringObject | null;
  solved: SolverResult | null;
  settings: ProjectionSettings;
  theme: 'dark' | 'light';
  onUpdateHelpers: (patch: Partial<HelperLineVisibility>) => void;
}

function isLayerVisible(layer: SheetLayer, h: HelperLineVisibility): boolean {
  if (layer === 'xy' || layer === 'object' || layer === 'section' || layer === 'development' || layer === 'hatch') {
    return true;
  }
  if (!h.masterHelpers) return false;
  switch (layer) {
    case 'projector': return h.projectors;
    case 'locus': return h.locusLines;
    case 'arc': return h.constructionArcs;
    case 'trueLength': return h.trueLengthLines;
    case 'trace': return h.traces;
    case 'axis': return h.centerAxisLines;
    case 'hidden': return h.hiddenEdges;
    case 'dimension': return h.dimensions;
    case 'label': return h.labels;
    case 'stageGuide': return h.stageGuides;
  }
}

function arcToSvgPath(arc: SheetArc): string {
  const a1 = (arc.startAngleDeg * Math.PI) / 180;
  const a2 = (arc.endAngleDeg * Math.PI) / 180;
  const x1 = arc.cx + arc.r * Math.cos(a1);
  const y1 = -(arc.cy + arc.r * Math.sin(a1));
  const x2 = arc.cx + arc.r * Math.cos(a2);
  const y2 = -(arc.cy + arc.r * Math.sin(a2));
  const diff = arc.endAngleDeg - arc.startAngleDeg;
  const largeArc = Math.abs(diff) > 180 ? 1 : 0;
  const sweep = diff >= 0 ? 0 : 1; // inverted Y in SVG
  return `M ${x1} ${y1} A ${arc.r} ${arc.r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}

export const DrawingSheetView = forwardRef<SVGSVGElement, DrawingSheetViewProps>(
  ({ obj, solved, settings, theme, onUpdateHelpers }, ref) => {
    const sheet = useMemo(() => {
      if (!obj || !solved) return null;
      return buildMultiStageSheet(obj, solved, settings.convention);
    }, [obj, solved, settings.convention]);

    const h = settings.helpers;

    if (!sheet) {
      return (
        <div className="w-full h-full flex items-center justify-center text-sm text-slate-500">
          Select an object to view its 2-Step / 3-Step Orthographic Drawing Sheet.
        </div>
      );
    }

    const pad = 26;
    const minX = sheet.bounds.minX - pad;
    const width = Math.max(180, sheet.bounds.maxX - sheet.bounds.minX + pad * 2);
    const minSvgY = -sheet.bounds.maxY - pad;
    const height = Math.max(120, sheet.bounds.maxY - sheet.bounds.minY + pad * 2);

    const objColor = theme === 'dark' ? '#f8fafc' : '#0f172a';

    const styleForLayer = (layer: SheetLayer) => {
      switch (layer) {
        case 'xy': return { stroke: '#f59e0b', strokeWidth: 1.0, dash: undefined };
        case 'object': return { stroke: obj?.color || objColor, strokeWidth: 1.5, dash: undefined };
        case 'development': return { stroke: '#10b981', strokeWidth: 1.4, dash: undefined };
        case 'section': return { stroke: '#ef4444', strokeWidth: 1.5, dash: '5 1.5 1.5 1.5' };
        case 'hatch': return { stroke: '#ef4444', strokeWidth: 0.45, dash: undefined };
        case 'hidden': return { stroke: '#94a3b8', strokeWidth: 0.9, dash: '2.5 2' };
        case 'projector': return { stroke: '#64748b', strokeWidth: 0.45, dash: '1.5 1.5' };
        case 'locus': return { stroke: '#38bdf8', strokeWidth: 0.55, dash: '4 2' };
        case 'arc': return { stroke: '#a855f7', strokeWidth: 0.65, dash: '2 1.5' };
        case 'trueLength': return { stroke: '#22c55e', strokeWidth: 1.0, dash: '3 1.5' };
        case 'trace': return { stroke: '#ec4899', strokeWidth: 0.85, dash: '2 2' };
        case 'axis': return { stroke: '#f59e0b', strokeWidth: 0.7, dash: '6 1.5 1.5 1.5' };
        default: return { stroke: '#94a3b8', strokeWidth: 0.7, dash: undefined };
      }
    };

    const helperToggles: Array<{ key: keyof HelperLineVisibility; label: string }> = [
      { key: 'projectors', label: 'Projectors' },
      { key: 'locusLines', label: 'Locus Lines' },
      { key: 'constructionArcs', label: 'Arcs' },
      { key: 'trueLengthLines', label: 'True Length' },
      { key: 'traces', label: 'Traces' },
      { key: 'centerAxisLines', label: 'Axis' },
      { key: 'hiddenEdges', label: 'Hidden' },
      { key: 'dimensions', label: 'Dims' },
      { key: 'labels', label: 'Labels' },
      { key: 'stageGuides', label: 'Stage Titles' },
    ];

    return (
      <div className="w-full h-full flex flex-col min-h-0">
        {/* Helper Line Control Bar */}
        <div className="no-print px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateHelpers({ masterHelpers: !h.masterHelpers })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-colors ${
                h.masterHelpers
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {h.masterHelpers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{h.masterHelpers ? 'Hide All Helpers' : 'Show All Helpers'}</span>
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-200 hidden md:inline">
              {sheet.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {helperToggles.map((t) => (
              <button
                key={t.key}
                disabled={!h.masterHelpers}
                onClick={() => onUpdateHelpers({ [t.key]: !h[t.key] })}
                className={`px-2 py-0.5 rounded border text-[10px] font-medium transition-colors disabled:opacity-35 ${
                  h[t.key]
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300'
                    : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drawing Canvas */}
        <div
          className={`flex-1 min-h-0 relative ${
            theme === 'dark' ? 'cad-grid-dark' : 'cad-grid-light'
          }`}
        >
          <svg
            ref={ref}
            viewBox={`${minX} ${minSvgY} ${width} ${height}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {sheet.lines.map((l, i) => {
              if (!isLayerVisible(l.layer, h)) return null;
              const st = styleForLayer(l.layer);
              return (
                <line
                  key={`l_${i}`}
                  x1={l.x1}
                  y1={-l.y1}
                  x2={l.x2}
                  y2={-l.y2}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                  strokeDasharray={st.dash}
                  strokeLinecap="round"
                />
              );
            })}

            {sheet.arcs.map((a, i) => {
              if (!isLayerVisible(a.layer, h)) return null;
              const st = styleForLayer(a.layer);
              return (
                <path
                  key={`a_${i}`}
                  d={arcToSvgPath(a)}
                  fill="none"
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                  strokeDasharray={st.dash}
                />
              );
            })}

            {sheet.points.map((pt, i) => {
              if (!isLayerVisible(pt.layer, h)) return null;
              const st = styleForLayer(pt.layer);
              return (
                <g key={`p_${i}`}>
                  <circle cx={pt.x} cy={-pt.y} r={1.4} fill={st.stroke} />
                  {pt.label && h.masterHelpers && h.labels && (
                    <text
                      x={pt.x + 2}
                      y={-pt.y - 2}
                      fontSize={4.0}
                      fontFamily="monospace"
                      fontWeight="600"
                      fill={st.stroke}
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              );
            })}

            {sheet.texts.map((t, i) => {
              if (!isLayerVisible(t.layer, h)) return null;
              const st = styleForLayer(t.layer);
              return (
                <text
                  key={`t_${i}`}
                  x={t.x}
                  y={-t.y}
                  fontSize={t.size ?? 4.2}
                  fontFamily="monospace"
                  fontWeight={t.layer === 'stageGuide' ? '700' : '500'}
                  fill={t.layer === 'stageGuide' ? '#60a5fa' : st.stroke}
                >
                  {t.text}
                </text>
              );
            })}
          </svg>

          <div className="absolute bottom-2 right-3 text-[11px] font-mono bg-slate-900/80 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
            {sheet.subtitle}
          </div>
        </div>
      </div>
    );
  }
);

DrawingSheetView.displayName = 'DrawingSheetView';

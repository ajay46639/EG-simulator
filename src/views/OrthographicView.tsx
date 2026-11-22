import { forwardRef, useMemo } from 'react';
import {
  EngineeringObject,
  MeshData,
  ProjectedViewData,
  ProjectionSettings,
} from '../types/engineering';
import { projectMeshToView, ViewType } from '../projections/projector';
import { AnimationStep } from '../animations/stepEngine';

export interface SharedOrthoBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface OrthographicViewProps {
  view: ViewType;
  title: string;
  items: Array<{ obj: EngineeringObject; mesh: MeshData }>;
  settings: ProjectionSettings;
  theme: 'dark' | 'light';
  activeStep: AnimationStep | null;
  sharedBounds?: SharedOrthoBounds;
}

export const OrthographicView = forwardRef<SVGSVGElement, OrthographicViewProps>(
  ({ view, title, items, settings, theme, activeStep, sharedBounds }, ref) => {
    const isStepVisible = useMemo(() => {
      if (!activeStep) return true;
      if (view === 'front') return activeStep.showFrontView;
      if (view === 'top') return activeStep.showTopView;
      if (view === 'side') return activeStep.showSideView;
      return true;
    }, [activeStep, view]);

    const projectedList: Array<{ obj: EngineeringObject; data: ProjectedViewData }> = useMemo(() => {
      if (!isStepVisible) return [];
      return items
        .filter((it) => it.obj.visible)
        .map((it) => ({
          obj: it.obj,
          data: projectMeshToView(it.mesh, view, settings),
        }));
    }, [items, view, settings, isStepVisible]);

    // Compute synchronized SVG viewBox so:
    // - Front View (u=X, v=Z) and Top View (u=X, v=±Y) share the EXACT same u-range & uniform scale!
    // - Front View (u=X, v=Z) and Side View (u=±Y, v=Z) share the EXACT same v-range & uniform scale!
    const { viewBox, uMin, uMax } = useMemo(() => {
      const pad = 24;
      if (sharedBounds) {
        const spanX = Math.max(80, sharedBounds.maxX - sharedBounds.minX + pad * 2);
        const spanY = Math.max(80, sharedBounds.maxY - sharedBounds.minY + pad * 2);
        const spanZ = Math.max(80, sharedBounds.maxZ - sharedBounds.minZ + pad * 2);
        const uniformSpan = Math.max(spanX, spanY, spanZ);

        const midX = (sharedBounds.minX + sharedBounds.maxX) / 2;
        const midZ = (sharedBounds.minZ + sharedBounds.maxZ) / 2;
        const isThird = settings.convention === 'third-angle';

        if (view === 'front') {
          const u0 = midX - uniformSpan / 2;
          const maxV = midZ + uniformSpan / 2;
          return { viewBox: `${u0} ${-maxV} ${uniformSpan} ${uniformSpan}`, uMin: u0, uMax: u0 + uniformSpan };
        }
        if (view === 'top') {
          const u0 = midX - uniformSpan / 2;
          const midV = isThird
            ? (sharedBounds.minY + sharedBounds.maxY) / 2
            : -(sharedBounds.minY + sharedBounds.maxY) / 2;
          const maxV = midV + uniformSpan / 2;
          return { viewBox: `${u0} ${-maxV} ${uniformSpan} ${uniformSpan}`, uMin: u0, uMax: u0 + uniformSpan };
        }
        if (view === 'side') {
          const midU = isThird
            ? -(sharedBounds.minY + sharedBounds.maxY) / 2
            : (sharedBounds.minY + sharedBounds.maxY) / 2;
          const u0 = midU - uniformSpan / 2;
          const maxV = midZ + uniformSpan / 2;
          return { viewBox: `${u0} ${-maxV} ${uniformSpan} ${uniformSpan}`, uMin: u0, uMax: u0 + uniformSpan };
        }
      }

      // Fallback auto-fit
      let minU = -20;
      let maxU = 140;
      let minV = -20;
      let maxV = 100;

      for (const { data } of projectedList) {
        for (const e of data.edges) {
          minU = Math.min(minU, e.start.u, e.end.u);
          maxU = Math.max(maxU, e.start.u, e.end.u);
          minV = Math.min(minV, e.start.v, e.end.v);
          maxV = Math.max(maxV, e.start.v, e.end.v);
        }
        for (const p of data.points) {
          minU = Math.min(minU, p.pos.u);
          maxU = Math.max(maxU, p.pos.u);
          minV = Math.min(minV, p.pos.v);
          maxV = Math.max(maxV, p.pos.v);
        }
      }

      const u0 = minU - pad;
      const w = Math.max(120, maxU - minU + pad * 2);
      const svgMinY = -maxV - pad;
      const h = Math.max(90, maxV - minV + pad * 2);
      return { viewBox: `${u0} ${svgMinY} ${w} ${h}`, uMin: u0, uMax: u0 + w };
    }, [projectedList, sharedBounds, view, settings.convention]);

    const visibleColor = theme === 'dark' ? '#e2e8f0' : '#0f172a';
    const hiddenColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    const projectorColor = theme === 'dark' ? '#475569' : '#cbd5e1';

    return (
      <div
        className={`w-full h-full relative select-none ${theme === 'dark' ? 'cad-grid-dark' : 'cad-grid-light'
          }`}
      >
        <svg
          ref={ref}
          viewBox={viewBox}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* XY Reference Line (v = 0 -> svgY = 0) */}
          {settings.showXY && (
            <g>
              <line
                x1={uMin - 200}
                y1={0}
                x2={uMax + 200}
                y2={0}
                stroke="#f59e0b"
                strokeWidth={0.9}
              />
              <text x={uMin + 5} y={-3} fontSize={4.5} fill="#f59e0b" fontFamily="monospace" fontWeight="700">
                X
              </text>
              <text x={uMax - 10} y={-3} fontSize={4.5} fill="#f59e0b" fontFamily="monospace" fontWeight="700">
                Y
              </text>
            </g>
          )}

          {/* Profile vertical reference line (u = 0 -> VP trace) for Side View */}
          {view === 'side' && settings.showXY && (
            <line
              x1={0}
              y1={-500}
              x2={0}
              y2={500}
              stroke="#64748b"
              strokeWidth={0.75}
              strokeDasharray="3 2"
            />
          )}

          {projectedList.map(({ obj, data }) => (
            <g key={obj.id}>
              {/* Edges (already sorted in BIS SP:46 line-precedence order!) */}
              {data.edges.map((e, idx) => {
                if (e.kind === 'hidden' && !settings.showHiddenLines) return null;
                if (
                  e.kind === 'projector' &&
                  !(activeStep ? activeStep.showProjectors : settings.showProjectors)
                ) {
                  return null;
                }

                let stroke = visibleColor;
                let strokeWidth = 1.25;
                let dash: string | undefined;

                if (e.kind === 'hidden') {
                  stroke = hiddenColor;
                  strokeWidth = 0.85;
                  dash = '2.5 2';
                } else if (e.kind === 'projector') {
                  stroke = projectorColor;
                  strokeWidth = 0.45;
                  dash = '2 2';
                } else if (e.kind === 'axis') {
                  stroke = '#f59e0b';
                  strokeWidth = 0.7;
                  dash = '5 1.5 1.5 1.5';
                } else if (e.kind === 'section') {
                  stroke = '#ef4444';
                  strokeWidth = 1.6;
                } else {
                  stroke = obj.color || visibleColor;
                }

                return (
                  <line
                    key={idx}
                    x1={e.start.u}
                    y1={-e.start.v}
                    x2={e.end.u}
                    y2={-e.end.v}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Points & Labels */}
              {data.points.map((pt, idx) => (
                <g key={`pt_${idx}`}>
                  <circle
                    cx={pt.pos.u}
                    cy={-pt.pos.v}
                    r={1.5}
                    fill={pt.color || obj.color}
                  />
                  {settings.showLabels && (
                    <text
                      x={pt.pos.u + 2.2}
                      y={-pt.pos.v - 2.2}
                      fontSize={4.4}
                      fontFamily="monospace"
                      fontWeight="600"
                      fill={pt.color || visibleColor}
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              ))}

              {/* Dimensions */}
              {settings.showDimensions &&
                data.dimensions.map((d, idx) => {
                  const mx = (d.from.u + d.to.u) / 2;
                  const my = -(d.from.v + d.to.v) / 2;
                  return (
                    <text
                      key={`dim_${idx}`}
                      x={mx + 2}
                      y={my - 3}
                      fontSize={4.2}
                      fontFamily="monospace"
                      fill="#38bdf8"
                    >
                      {d.text}
                    </text>
                  );
                })}
            </g>
          ))}
        </svg>

        {!isStepVisible && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-[1px]">
            <span className="text-xs font-mono text-slate-400 px-3 py-1 rounded border border-slate-700 bg-slate-900/90">
              {title} — awaiting step in animation
            </span>
          </div>
        )}
      </div>
    );
  }
);

OrthographicView.displayName = 'OrthographicView';

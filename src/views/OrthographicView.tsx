import React, { forwardRef, useMemo, useRef, useState } from 'react';
import {
  EngineeringObject,
  MeshData,
  ProjectedViewData,
  ProjectionSettings,
} from '../types/engineering';
import { projectMeshToView, ViewType } from '../projections/projector';
import { AnimationStep } from '../animations/stepEngine';
import { useProjectStore } from '../state/useProjectStore';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

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
    const containerRef = useRef<HTMLDivElement>(null);
    const { selectObject, selectedObjectId } = useProjectStore();

    // 2D Pan, Zoom & Hover Interactivity State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [cursorCoord, setCursorCoord] = useState<{ u: number; v: number } | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<{ label: string; u: number; v: number } | null>(null);

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

    // Compute base SVG viewBox so:
    // - Front View (u=X, v=Z) and Top View (u=X, v=±Y) share the EXACT same u-range & uniform scale!
    // - Front View (u=X, v=Z) and Side View (u=±Y, v=Z) share the EXACT same v-range & uniform scale!
    const { baseU0, baseV0, baseW, baseH, uMin, uMax } = useMemo(() => {
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
          return {
            baseU0: u0,
            baseV0: -maxV,
            baseW: uniformSpan,
            baseH: uniformSpan,
            uMin: u0,
            uMax: u0 + uniformSpan,
          };
        }
        if (view === 'top') {
          const u0 = midX - uniformSpan / 2;
          const midV = isThird
            ? (sharedBounds.minY + sharedBounds.maxY) / 2
            : -(sharedBounds.minY + sharedBounds.maxY) / 2;
          const maxV = midV + uniformSpan / 2;
          return {
            baseU0: u0,
            baseV0: -maxV,
            baseW: uniformSpan,
            baseH: uniformSpan,
            uMin: u0,
            uMax: u0 + uniformSpan,
          };
        }
        if (view === 'side') {
          const midU = isThird
            ? -(sharedBounds.minY + sharedBounds.maxY) / 2
            : (sharedBounds.minY + sharedBounds.maxY) / 2;
          const u0 = midU - uniformSpan / 2;
          const maxV = midZ + uniformSpan / 2;
          return {
            baseU0: u0,
            baseV0: -maxV,
            baseW: uniformSpan,
            baseH: uniformSpan,
            uMin: u0,
            uMax: u0 + uniformSpan,
          };
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
      return {
        baseU0: u0,
        baseV0: svgMinY,
        baseW: w,
        baseH: h,
        uMin: u0,
        uMax: u0 + w,
      };
    }, [projectedList, sharedBounds, view, settings.convention]);

    // Active viewBox taking interactive 2D zoom and pan into account
    const activeViewBox = useMemo(() => {
      const currentW = baseW / zoom;
      const currentH = baseH / zoom;
      const currentU0 = baseU0 + pan.x + (baseW - currentW) / 2;
      const currentV0 = baseV0 + pan.y + (baseH - currentH) / 2;
      return `${currentU0} ${currentV0} ${currentW} ${currentH}`;
    }, [baseW, baseH, baseU0, baseV0, zoom, pan]);

    // Mouse handlers for 2D pan & zoom
    const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((prev) => Math.min(10, Math.max(0.2, prev * factor)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 0 || e.button === 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const currentW = baseW / zoom;
        const currentH = baseH / zoom;
        const currentU0 = baseU0 + pan.x + (baseW - currentW) / 2;
        const currentV0 = baseV0 + pan.y + (baseH - currentH) / 2;
        const u = currentU0 + (px / rect.width) * currentW;
        const v = -(currentV0 + (py / rect.height) * currentH);
        setCursorCoord({ u: Math.round(u * 10) / 10, v: Math.round(v * 10) / 10 });
      }

      if (isDragging && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const currentW = baseW / zoom;
        const currentH = baseH / zoom;
        const dx = (e.clientX - dragStart.x) * (currentW / rect.width);
        const dy = (e.clientY - dragStart.y) * (currentH / rect.height);
        setPan((prev) => ({ x: prev.x - dx, y: prev.y - dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleDoubleClick = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };

    const reset2DView = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };

    const visibleColor = theme === 'dark' ? '#e2e8f0' : '#0f172a';
    const hiddenColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    const projectorColor = theme === 'dark' ? '#475569' : '#cbd5e1';

    return (
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setCursorCoord(null);
        }}
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full relative select-none overflow-hidden group ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${theme === 'dark' ? 'cad-grid-dark' : 'cad-grid-light'}`}
      >
        <svg
          ref={ref}
          viewBox={activeViewBox}
          className="w-full h-full pointer-events-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* XY Reference Line (v = 0 -> svgY = 0) */}
          {settings.showXY && (
            <g>
              <line
                x1={uMin - 2000}
                y1={0}
                x2={uMax + 2000}
                y2={0}
                stroke="#f59e0b"
                strokeWidth={0.9 / Math.sqrt(zoom)}
              />
              <text x={uMin + 5} y={-3} fontSize={4.5 / Math.sqrt(zoom)} fill="#f59e0b" fontFamily="monospace" fontWeight="700">
                X
              </text>
              <text x={uMax - 10} y={-3} fontSize={4.5 / Math.sqrt(zoom)} fill="#f59e0b" fontFamily="monospace" fontWeight="700">
                Y
              </text>
            </g>
          )}

          {/* Profile vertical reference line (u = 0 -> VP trace) for Side View */}
          {view === 'side' && settings.showXY && (
            <line
              x1={0}
              y1={-5000}
              x2={0}
              y2={5000}
              stroke="#64748b"
              strokeWidth={0.75 / Math.sqrt(zoom)}
              strokeDasharray="3 2"
            />
          )}

          {projectedList.map(({ obj, data }) => {
            const isSelected = obj.id === selectedObjectId;

            return (
              <g
                key={obj.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectObject(obj.id);
                }}
                className="cursor-pointer"
              >
                {/* Edges (already sorted in BIS SP:46 line-precedence order!) */}
                {data.edges.map((e, idx) => {
                  if (e.kind === 'hidden' && !settings.showHiddenLines) return null;
                  if (
                    e.kind === 'projector' &&
                    !(activeStep ? activeStep.showProjectors : settings.showProjectors)
                  ) {
                    return null;
                  }

                  let stroke = isSelected ? '#3b82f6' : visibleColor;
                  let strokeWidth = isSelected ? 1.8 : 1.25;
                  let dash: string | undefined;

                  if (e.kind === 'hidden') {
                    stroke = isSelected ? '#60a5fa' : hiddenColor;
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
                    stroke = isSelected ? '#3b82f6' : obj.color || visibleColor;
                  }

                  return (
                    <line
                      key={idx}
                      x1={e.start.u}
                      y1={-e.start.v}
                      x2={e.end.u}
                      y2={-e.end.v}
                      stroke={stroke}
                      strokeWidth={strokeWidth / Math.sqrt(zoom)}
                      strokeDasharray={dash}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Points & Labels */}
                {data.points.map((pt, idx) => {
                  const isHovered = hoveredPoint?.label === pt.label;
                  return (
                    <g
                      key={`pt_${idx}`}
                      onMouseEnter={() => setHoveredPoint({ label: pt.label, u: pt.pos.u, v: pt.pos.v })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={pt.pos.u}
                        cy={-pt.pos.v}
                        r={(isHovered ? 2.5 : 1.5) / Math.sqrt(zoom)}
                        fill={isHovered ? '#ef4444' : pt.color || obj.color}
                        stroke={isHovered ? '#ffffff' : 'none'}
                        strokeWidth={0.5 / Math.sqrt(zoom)}
                      />
                      {settings.showLabels && (
                        <text
                          x={pt.pos.u + 2.2 / Math.sqrt(zoom)}
                          y={-pt.pos.v - 2.2 / Math.sqrt(zoom)}
                          fontSize={4.4 / Math.sqrt(zoom)}
                          fontFamily="monospace"
                          fontWeight={isHovered ? 'bold' : '600'}
                          fill={isHovered ? '#ef4444' : pt.color || visibleColor}
                        >
                          {pt.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Dimensions */}
                {settings.showDimensions &&
                  data.dimensions.map((d, idx) => {
                    const mx = (d.from.u + d.to.u) / 2;
                    const my = -(d.from.v + d.to.v) / 2;
                    return (
                      <text
                        key={`dim_${idx}`}
                        x={mx + 2 / Math.sqrt(zoom)}
                        y={my - 3 / Math.sqrt(zoom)}
                        fontSize={4.2 / Math.sqrt(zoom)}
                        fontFamily="monospace"
                        fill="#38bdf8"
                      >
                        {d.text}
                      </text>
                    );
                  })}
              </g>
            );
          })}
        </svg>

        {/* 2D Interactive Controls Pill (Bottom-Right) */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-md opacity-80 group-hover:opacity-100 transition-opacity z-10 text-xs">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((prev) => Math.min(10, prev * 1.25));
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            title="Zoom In 2D"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((prev) => Math.max(0.2, prev * 0.8));
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            title="Zoom Out 2D"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset2DView();
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            title="Reset Pan & Zoom (1:1)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 px-1 border-l border-slate-200 dark:border-slate-700">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Live Coordinate Inspector Overlay (Bottom-Left) */}
        {cursorCoord && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 pointer-events-none z-10">
            {view === 'front' ? `X: ${cursorCoord.u} mm · Z: ${cursorCoord.v} mm` : view === 'top' ? `X: ${cursorCoord.u} mm · Y: ${cursorCoord.v} mm` : `Y: ${cursorCoord.u} mm · Z: ${cursorCoord.v} mm`}
          </div>
        )}

        {/* Hovered Point Detail Callout (Top-Left) */}
        {hoveredPoint && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-500/90 text-white text-[10px] font-mono shadow-md pointer-events-none z-10 animate-in fade-in duration-100">
            Point <span className="font-bold">{hoveredPoint.label}</span>: ({hoveredPoint.u}, {hoveredPoint.v}) mm
          </div>
        )}

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

import { useEffect, useMemo, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useProjectStore, MaximizedPanel } from './state/useProjectStore';
import { solveObject } from './solver/constraintSolver';
import { buildObjectMesh } from './geometry/builders';
import { getAnimationSteps } from './animations/stepEngine';
import { TopToolbar } from './components/TopToolbar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { AnimationBar } from './components/AnimationBar';
import { ThreeViewport } from './views/ThreeViewport';
import { OrthographicView, SharedOrthoBounds } from './views/OrthographicView';
import { DrawingSheetView } from './views/DrawingSheetView';
import { CurvesScalesView } from './views/CurvesScalesView';
import { PictorialIntersectionView } from './views/PictorialIntersectionView';
import { AccessGate } from './components/AccessGate';
import { useAuthStore } from './state/useAuthStore';

function MainWorkspace() {
  const {
    theme,
    workspaceTab,
    objects,
    selectedObjectId,
    selectedAltIndex,
    projectionSettings,
    updateHelperVisibility,
    maximizedPanel,
    setMaximizedPanel,
    cameraResetTrigger,
    triggerCameraReset,
    selectObject,
    undo,
    redo,
    animationActive,
    animationPlaying,
    animationStep,
    setAnimationPlaying,
    measureMode,
    measurePoints,
    addMeasurePoint,
  } = useProjectStore();

  const frontSvgRef = useRef<SVGSVGElement>(null);
  const topSvgRef = useRef<SVGSVGElement>(null);
  const sideSvgRef = useRef<SVGSVGElement>(null);
  const sheetSvgRef = useRef<SVGSVGElement>(null);

  const solvedItems = useMemo(() => {
    return objects.map((obj) => {
      const altIdx = selectedAltIndex[obj.id] ?? 0;
      const solved = solveObject(obj, altIdx);
      const mesh = buildObjectMesh(obj, solved);
      return { obj, solved, mesh };
    });
  }, [objects, selectedAltIndex]);

  const sharedBounds: SharedOrthoBounds = useMemo(() => {
    let minX = 0, maxX = 110;
    let minY = 0, maxY = 90;
    let minZ = 0, maxZ = 90;
    let hasAny = false;
    for (const { obj, mesh } of solvedItems) {
      if (!obj.visible || mesh.vertices.length === 0) continue;
      if (!hasAny) {
        minX = Math.min(0, mesh.boundingBox.min.x);
        maxX = Math.max(80, mesh.boundingBox.max.x);
        minY = Math.min(0, mesh.boundingBox.min.y);
        maxY = Math.max(60, mesh.boundingBox.max.y);
        minZ = Math.min(0, mesh.boundingBox.min.z);
        maxZ = Math.max(60, mesh.boundingBox.max.z);
        hasAny = true;
      } else {
        minX = Math.min(minX, mesh.boundingBox.min.x);
        maxX = Math.max(maxX, mesh.boundingBox.max.x);
        minY = Math.min(minY, mesh.boundingBox.min.y);
        maxY = Math.max(maxY, mesh.boundingBox.max.y);
        minZ = Math.min(minZ, mesh.boundingBox.min.z);
        maxZ = Math.max(maxZ, mesh.boundingBox.max.z);
      }
    }
    return { minX, maxX, minY, maxY, minZ, maxZ };
  }, [solvedItems]);

  const selectedItem = useMemo(
    () => solvedItems.find((it) => it.obj.id === selectedObjectId) ?? null,
    [solvedItems, selectedObjectId]
  );

  const animationSteps = useMemo(() => {
    if (!selectedItem) return [];
    return getAnimationSteps(selectedItem.obj.category, selectedItem.solved);
  }, [selectedItem]);

  const activeStep =
    animationActive && animationSteps.length > 0
      ? animationSteps[Math.min(animationStep, animationSteps.length - 1)]
      : null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === 'r') {
        triggerCameraReset();
      } else if (e.key === ' ' && animationActive) {
        e.preventDefault();
        setAnimationPlaying(!animationPlaying);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, triggerCameraReset, animationActive, animationPlaying, setAnimationPlaying]);

  const toggleMaximize = (panel: MaximizedPanel) => {
    setMaximizedPanel(maximizedPanel === panel ? 'none' : panel);
  };

  const renderPanelHeader = (title: string, subtitle: string, panel: MaximizedPanel) => (
    <div className="h-7 px-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-[11px] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{title}</span>
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>
      </div>
      <button
        onClick={() => toggleMaximize(panel)}
        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 shrink-0"
      >
        {maximizedPanel === panel ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  const isFirstAngle = projectionSettings.convention === 'first-angle';

  const frontPanel = (maximizedPanel === 'none' || maximizedPanel === 'front') && (
    <section className="flex flex-col rounded overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-0">
      {renderPanelHeader('Front View (Elevation)', 'VP (X-Z) · Aligned with TV & SV', 'front')}
      <div className="flex-1 min-h-0">
        <OrthographicView
          ref={frontSvgRef}
          view="front"
          title="Front View"
          items={solvedItems}
          settings={projectionSettings}
          theme={theme}
          activeStep={activeStep}
          sharedBounds={sharedBounds}
        />
      </div>
    </section>
  );

  const topPanel = (maximizedPanel === 'none' || maximizedPanel === 'top') && (
    <section className="flex flex-col rounded overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-0">
      {renderPanelHeader(
        'Top View (Plan)',
        isFirstAngle ? 'HP (X-Y) · Below FV [1st°]' : 'HP (X-Y) · Above FV [3rd°]',
        'top'
      )}
      <div className="flex-1 min-h-0">
        <OrthographicView
          ref={topSvgRef}
          view="top"
          title="Top View"
          items={solvedItems}
          settings={projectionSettings}
          theme={theme}
          activeStep={activeStep}
          sharedBounds={sharedBounds}
        />
      </div>
    </section>
  );

  const sidePanel = (maximizedPanel === 'none' || maximizedPanel === 'side') && (
    <section className="flex flex-col rounded overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-0">
      {renderPanelHeader(
        isFirstAngle ? 'Left-Hand Side View (LHSV)' : 'Right-Hand Side View (RHSV)',
        'PP (Y-Z) · Aligned with FV',
        'side'
      )}
      <div className="flex-1 min-h-0">
        <OrthographicView
          ref={sideSvgRef}
          view="side"
          title="Side View"
          items={solvedItems}
          settings={projectionSettings}
          theme={theme}
          activeStep={activeStep}
          sharedBounds={sharedBounds}
        />
      </div>
    </section>
  );

  const threePanel = (maximizedPanel === 'none' || maximizedPanel === '3d') && (
    <section className="flex flex-col rounded overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-0">
      {renderPanelHeader('3D Model View', 'Interactive HP / VP / XY', '3d')}
      <div className="flex-1 min-h-0">
        <ThreeViewport
          items={solvedItems}
          selectedId={selectedObjectId}
          settings={projectionSettings}
          theme={theme}
          cameraResetTrigger={cameraResetTrigger}
          activeStep={activeStep}
          measureMode={measureMode}
          measurePoints={measurePoints}
          onSelectObject={selectObject}
          onMeasureClick={addMeasurePoint}
        />
      </div>
    </section>
  );

  const showSidebars = workspaceTab === '4view' || workspaceTab === 'sheet' || workspaceTab === 'pictorial';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopToolbar frontSvgRef={frontSvgRef} sheetSvgRef={sheetSvgRef} />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {showSidebars && <LeftSidebar />}

        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {workspaceTab === '4view' && (
            <div
              className={`flex-1 min-h-0 grid gap-1 p-1 bg-slate-200 dark:bg-slate-950 ${
                maximizedPanel === 'none' ? 'grid-cols-1 md:grid-cols-2 md:grid-rows-2' : 'grid-cols-1 grid-rows-1'
              }`}
            >
              {isFirstAngle ? (
                <>
                  {frontPanel}
                  {sidePanel}
                  {topPanel}
                  {threePanel}
                </>
              ) : (
                <>
                  {topPanel}
                  {threePanel}
                  {frontPanel}
                  {sidePanel}
                </>
              )}
            </div>
          )}

          {workspaceTab === 'sheet' && (
            <DrawingSheetView
              ref={sheetSvgRef}
              obj={selectedItem?.obj ?? null}
              solved={selectedItem?.solved ?? null}
              settings={projectionSettings}
              theme={theme}
              onUpdateHelpers={updateHelperVisibility}
            />
          )}

          {(workspaceTab === 'pictorial' || workspaceTab === 'intersect') && (
            <PictorialIntersectionView
              mode={workspaceTab}
              selectedObj={selectedItem?.obj ?? null}
              selectedMesh={selectedItem?.mesh ?? null}
              theme={theme}
            />
          )}

          {(workspaceTab === 'curves' || workspaceTab === 'scales') && (
            <CurvesScalesView section={workspaceTab} theme={theme} />
          )}

          {workspaceTab === '4view' && <AnimationBar steps={animationSteps} />}
        </main>

        {showSidebars && (
          <RightSidebar selectedObj={selectedItem?.obj ?? null} solved={selectedItem?.solved ?? null} />
        )}
      </div>
    </div>
  );
}

export function App() {
  const { isAuthenticated } = useAuthStore();
  const theme = useProjectStore((s) => s.theme);

  if (!isAuthenticated) {
    return <AccessGate theme={theme} />;
  }

  return <MainWorkspace />;
}

export default App;

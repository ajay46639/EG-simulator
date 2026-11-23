import { useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Maximize2,
  Minimize,
  Minimize2,
  Moon,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  RotateCcw,
  Sun,
} from 'lucide-react';
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
import { WorkspaceTab } from './types/engineering';

function MainWorkspace() {
  const {
    theme,
    toggleTheme,
    workspaceTab,
    setWorkspaceTab,
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
    showLeftSidebar,
    showRightSidebar,
    toggleLeftSidebar,
    toggleRightSidebar,
    appFullscreen,
    toggleAppFullscreen,
    setAppFullscreen,
    focusView,
    setFocusView,
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

  // Global keybindings
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
      } else if (e.key === 'Escape') {
        if (focusView !== 'none') {
          e.preventDefault();
          setFocusView('none');
        } else if (appFullscreen) {
          e.preventDefault();
          setAppFullscreen(false);
        }
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleAppFullscreen();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    undo,
    redo,
    triggerCameraReset,
    animationActive,
    animationPlaying,
    setAnimationPlaying,
    focusView,
    setFocusView,
    appFullscreen,
    setAppFullscreen,
    toggleAppFullscreen,
  ]);

  // Sync fullscreen change event
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && appFullscreen) {
        setAppFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [appFullscreen, setAppFullscreen]);

  const toggleMaximize = (panel: MaximizedPanel) => {
    setMaximizedPanel(maximizedPanel === panel ? 'none' : panel);
  };

  const renderPanelHeader = (title: string, subtitle: string, panel: MaximizedPanel) => (
    <div className="h-7 px-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-[11px] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{title}</span>
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => toggleMaximize(panel)}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          title={maximizedPanel === panel ? 'Restore 4-View Grid' : 'Maximize Panel'}
        >
          {maximizedPanel === panel ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setFocusView(panel)}
          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-colors"
          title="Real Fullscreen (Solo View - Hide all extra features)"
        >
          <Expand className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const isFirstAngle = projectionSettings.convention === 'first-angle';

  const frontPanel = (maximizedPanel === 'none' || maximizedPanel === 'front') && (
    <section className="flex flex-col rounded overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-0">
      {renderPanelHeader('Front View (Elevation)', 'VP (X-Z) · 2D Interactive', 'front')}
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
        isFirstAngle ? 'HP (X-Y) · 2D Interactive [1st°]' : 'HP (X-Y) · 2D Interactive [3rd°]',
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
        isFirstAngle ? 'Side View (Profile - Left)' : 'Side View (Profile - Right)',
        isFirstAngle ? 'PP (Y-Z) · 2D Interactive [1st°]' : 'PP (Y-Z) · 2D Interactive [3rd°]',
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
      {renderPanelHeader('3D Model View', 'Interactive HP / VP / XY · 3D Viewport', '3d')}
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

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: '4view', label: '4-View' },
    { id: 'sheet', label: 'Sheet' },
    { id: 'pictorial', label: 'Iso/Obl/Persp' },
    { id: 'intersect', label: 'Intersect' },
    { id: 'curves', label: 'Curves' },
    { id: 'scales', label: 'Scales' },
  ];

  // -------------------------------------------------------------
  // REAL FULLSCREEN / SOLO VIEW FOR INDIVIDUAL PROJECTIONS (3D, Front, Top, Side)
  // -------------------------------------------------------------
  if (focusView !== 'none') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none">
        {/* Floating Glass Control Pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {focusView === '3d'
              ? '3D Interactive Simulation'
              : focusView === 'front'
              ? 'Front View (Elevation - 2D)'
              : focusView === 'top'
              ? 'Top View (Plan - 2D)'
              : 'Side View (Profile - 2D)'}
          </span>

          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              showLeftSidebar
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title={showLeftSidebar ? 'Hide Left Features Wall' : 'Show Left Features Wall'}
          >
            {showLeftSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">Features</span>
          </button>

          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              showRightSidebar
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title={showRightSidebar ? 'Hide Right Parameters Wall' : 'Show Right Parameters Wall'}
          >
            {showRightSidebar ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">Params</span>
          </button>

          {focusView === '3d' && (
            <button
              onClick={triggerCameraReset}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors"
              title="Reset 3D Camera"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Reset View</span>
            </button>
          )}

          <button
            onClick={() => setFocusView('none')}
            className="p-1.5 px-2.5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1 text-[11px]"
            title="Exit Real Fullscreen (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Fullscreen</span>
          </button>
        </div>

        {/* Real Fullscreen Viewport Body */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {showLeftSidebar && <LeftSidebar />}

          <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">
            {focusView === '3d' && (
              <div className="w-full h-full">
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
            )}

            {focusView === 'front' && (
              <div className="w-full h-full">
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
            )}

            {focusView === 'top' && (
              <div className="w-full h-full">
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
            )}

            {focusView === 'side' && (
              <div className="w-full h-full">
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
            )}
          </main>

          {showRightSidebar && (
            <RightSidebar selectedObj={selectedItem?.obj ?? null} solved={selectedItem?.solved ?? null} />
          )}

          {/* Quick edge slide-tabs for revealing sidebars */}
          {!showLeftSidebar && (
            <button
              onClick={toggleLeftSidebar}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-blue-600 hover:text-white border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-md shadow-md text-slate-700 dark:text-slate-200 transition-all"
              title="Show Left Features Wall"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {!showRightSidebar && (
            <button
              onClick={toggleRightSidebar}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-blue-600 hover:text-white border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-md shadow-md text-slate-700 dark:text-slate-200 transition-all"
              title="Show Right Parameters Wall"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NORMAL WORKSPACE (with whole-platform Zen fullscreen option)
  // -------------------------------------------------------------
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden select-none">
      {/* Platform Zen Fullscreen Floating Island Header */}
      {appFullscreen ? (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="font-bold text-slate-900 dark:text-white pr-2 border-r border-slate-200 dark:border-slate-700">
            EG SIMULATOR <span className="text-[10px] text-blue-500 font-mono">v4 Beta</span>
          </span>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full border border-slate-200 dark:border-slate-700">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setWorkspaceTab(t.id)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  workspaceTab === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              showLeftSidebar
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title={showLeftSidebar ? 'Hide Left Features Wall' : 'Show Left Features Wall'}
          >
            {showLeftSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">Features</span>
          </button>

          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              showRightSidebar
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title={showRightSidebar ? 'Hide Right Parameters Wall' : 'Show Right Parameters Wall'}
          >
            {showRightSidebar ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">Params</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleAppFullscreen}
            className="p-1.5 px-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-1 text-[11px]"
            title="Exit App Fullscreen (Esc or F11)"
          >
            <Minimize className="w-3.5 h-3.5" />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      ) : (
        <TopToolbar frontSvgRef={frontSvgRef} sheetSvgRef={sheetSvgRef} />
      )}

      {/* Main Container */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {showSidebars && showLeftSidebar && <LeftSidebar />}

        <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">
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

        {showSidebars && showRightSidebar && (
          <RightSidebar selectedObj={selectedItem?.obj ?? null} solved={selectedItem?.solved ?? null} />
        )}

        {/* Floating edge slide tabs to reveal hidden sidebars in normal mode */}
        {showSidebars && !showLeftSidebar && (
          <button
            onClick={toggleLeftSidebar}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-blue-600 hover:text-white border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-md shadow-md text-slate-700 dark:text-slate-200 transition-all"
            title="Show Left Features Wall"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {showSidebars && !showRightSidebar && (
          <button
            onClick={toggleRightSidebar}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-blue-600 hover:text-white border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-md shadow-md text-slate-700 dark:text-slate-200 transition-all"
            title="Show Right Parameters Wall"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function App() {
  const { isAuthenticated } = useAuthStore();
  const theme = useProjectStore((s) => s.theme);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  if (!isAuthenticated) {
    return <AccessGate theme={theme} />;
  }

  return <MainWorkspace />;
}

export default App;

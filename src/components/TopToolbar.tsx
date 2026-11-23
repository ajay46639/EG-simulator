import React, { useRef, useState } from 'react';
import {
  Box,
  ChevronDown,
  Compass,
  Download,
  Eye,
  EyeOff,
  FilePlus,
  FolderOpen,
  GitMerge,
  Grid,
  LayoutGrid,
  LogOut,
  Maximize,
  Menu,
  Minimize,
  Moon,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  PlayCircle,
  Redo2,
  RotateCcw,
  Ruler,
  Save,
  Sliders,
  Sun,
  Undo2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useProjectStore } from '../state/useProjectStore';
import { useAuthStore } from '../state/useAuthStore';
import { WorkspaceTab } from '../types/engineering';
import {
  exportDrawingSheetPDF,
  exportProjectAsJSON,
  exportSVGAsPNG,
  exportSVGElement,
} from '../utils/export';

interface TopToolbarProps {
  frontSvgRef: React.RefObject<SVGSVGElement>;
  sheetSvgRef: React.RefObject<SVGSVGElement>;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ frontSvgRef, sheetSvgRef }) => {
  const {
    projectName,
    setProjectName,
    workspaceTab,
    setWorkspaceTab,
    theme,
    toggleTheme,
    past,
    future,
    undo,
    redo,
    triggerCameraReset,
    projectionSettings,
    updateProjectionSettings,
    updateHelperVisibility,
    animationActive,
    setAnimationActive,
    measureMode,
    toggleMeasureMode,
    newProject,
    exportProjectJSON,
    importProjectJSON,
    showLeftSidebar,
    toggleLeftSidebar,
    showRightSidebar,
    toggleRightSidebar,
    appFullscreen,
    toggleAppFullscreen,
  } = useProjectStore();

  const { user, logout } = useAuthStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTabDropdownOpen, setMobileTabDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      if (!appFullscreen) toggleAppFullscreen();
    } else {
      document.exitFullscreen().catch(() => {});
      if (appFullscreen) toggleAppFullscreen();
    }
  };

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importProjectJSON(JSON.parse(String(reader.result)));
      } catch {
        alert('Invalid EG SIMULATOR project JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: '4view', label: '4-View', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'sheet', label: '2/3-Step Sheet', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 'pictorial', label: 'Iso/Obl/Persp', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'intersect', label: 'Intersect', icon: <GitMerge className="w-3.5 h-3.5" /> },
    { id: 'curves', label: 'Curves', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'scales', label: 'Scales', icon: <Ruler className="w-3.5 h-3.5" /> },
  ];

  const btnCls =
    'flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ' +
    'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40';

  const helpersOn = projectionSettings.helpers.masterHelpers;
  const currentTab = tabs.find((t) => t.id === workspaceTab) || tabs[0];

  return (
    <>
      {/* MOBILE TOPBAR (< md) */}
      <header className="flex md:hidden h-12 px-2.5 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none shrink-0 z-30 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Box className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white truncate">
              EG SIMULATOR
            </span>
            <span className="text-[9px] font-mono text-blue-500 font-semibold leading-none">v4 Beta</span>
          </div>
        </div>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Tab Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setMobileTabDropdownOpen(!mobileTabDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200"
              title="Switch Workspace Tab"
            >
              {currentTab.icon}
              <span className="max-w-[65px] truncate">{currentTab.label}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {mobileTabDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMobileTabDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setWorkspaceTab(t.id);
                        setMobileTabDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                        workspaceTab === t.id
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Left Features Drawer Toggle */}
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded-lg border transition-colors ${
              showLeftSidebar
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Toggle Scene & Features Wall"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {/* Right Parameters Drawer Toggle */}
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded-lg border transition-colors ${
              showRightSidebar
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Toggle Parameters Wall"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* 3D Camera Reset */}
          <button
            onClick={triggerCameraReset}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-500"
            title="Reset 3D Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              mobileMenuOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Open Control Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE FULL MENU MODAL / SHEET */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed inset-x-0 top-12 max-h-[calc(100vh-3.5rem)] overflow-y-auto bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-4 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-500" />
                Simulator Tools & Settings
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Projection & View Controls */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Projection & Display
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    updateProjectionSettings({
                      convention: projectionSettings.convention === 'first-angle' ? 'third-angle' : 'first-angle',
                    });
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <span>Projection Angle</span>
                  <span className="font-mono font-bold text-blue-500">
                    {projectionSettings.convention === 'first-angle' ? '1st° Angle' : '3rd° Angle'}
                  </span>
                </button>

                <button
                  onClick={() => updateHelperVisibility({ masterHelpers: !helpersOn })}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium ${
                    helpersOn
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <span>Construction Helpers</span>
                  {helpersOn ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={toggleMeasureMode}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium ${
                    measureMode
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>Measure 3D Distance</span>
                  <Ruler className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setAnimationActive(!animationActive)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium ${
                    animationActive
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>Step-by-Step Mode</span>
                  <PlayCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* History & Files */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Project & History
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={undo}
                  disabled={past.length === 0}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium disabled:opacity-40"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>Undo</span>
                </button>
                <button
                  onClick={redo}
                  disabled={future.length === 0}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium disabled:opacity-40"
                >
                  <Redo2 className="w-4 h-4" />
                  <span>Redo</span>
                </button>

                <button
                  onClick={() => {
                    newProject();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
                <button
                  onClick={() => {
                    exportProjectAsJSON(exportProjectJSON());
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <Save className="w-4 h-4" />
                  <span>Save JSON</span>
                </button>
              </div>
            </div>

            {/* Export Section */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Export & Print
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    exportSVGElement(
                      workspaceTab === 'sheet' ? sheetSvgRef.current : frontSvgRef.current,
                      workspaceTab === 'sheet' ? 'drawing_sheet.svg' : 'front_view.svg'
                    );
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-left flex items-center justify-between"
                >
                  <span>Export SVG</span>
                  <Download className="w-4 h-4 text-blue-500" />
                </button>
                <button
                  onClick={() => {
                    exportSVGAsPNG(
                      workspaceTab === 'sheet' ? sheetSvgRef.current : frontSvgRef.current,
                      workspaceTab === 'sheet' ? 'drawing_sheet.png' : 'front_view.png'
                    );
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-left flex items-center justify-between"
                >
                  <span>Export PNG</span>
                  <Download className="w-4 h-4 text-blue-500" />
                </button>
                <button
                  onClick={() => {
                    exportDrawingSheetPDF();
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-left flex items-center justify-between"
                >
                  <span>Print / Save Sheet (PDF)</span>
                  <Download className="w-4 h-4 text-blue-500" />
                </button>
              </div>
            </div>

            {/* Preferences & System */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                System & Display
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <span>Appearance</span>
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                </button>

                <button
                  onClick={() => {
                    handleToggleFullscreen();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                >
                  <span>Fullscreen</span>
                  {appFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* User Account */}
            {user && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-500" />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white">{user.name}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Do you want to log out of EG SIMULATOR?')) {
                      logout();
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 text-xs font-medium flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* DESKTOP TOPBAR (md:flex) */}
      <header className="hidden md:flex h-12 px-2.5 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none shrink-0 z-20 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 font-semibold text-sm tracking-tight text-slate-900 dark:text-white shrink-0">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white">
            <Box className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline">EG SIMULATOR</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold hidden lg:inline">v4 Beta</span>
        </div>

        <button
          onClick={toggleLeftSidebar}
          className={`${btnCls} ${!showLeftSidebar ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold' : ''}`}
          title={showLeftSidebar ? 'Hide Left Features Wall' : 'Show Left Features Wall'}
        >
          {showLeftSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
          <span className="hidden 2xl:inline">{showLeftSidebar ? 'Features' : 'Show Features'}</span>
        </button>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setWorkspaceTab(t.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                workspaceTab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.icon}
              <span className="hidden xl:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="hidden 2xl:block text-xs font-medium bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 rounded px-2 py-1 outline-none text-slate-700 dark:text-slate-200 w-36"
          title="Project Name"
        />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={newProject} className={btnCls} title="New Project">
          <FilePlus className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className={btnCls} title="Open JSON">
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleOpenFile} className="hidden" />
        <button onClick={() => exportProjectAsJSON(exportProjectJSON())} className={btnCls} title="Save JSON">
          <Save className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

        <button onClick={undo} disabled={past.length === 0} className={btnCls} title="Undo (Ctrl+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={redo} disabled={future.length === 0} className={btnCls} title="Redo (Ctrl+Y)">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={triggerCameraReset} className={btnCls} title="Reset 3D Camera (R)">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

        <button
          onClick={() => updateHelperVisibility({ masterHelpers: !helpersOn })}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
            helpersOn
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
          }`}
          title="Hide / Unhide All Helper & Construction Lines"
        >
          {helpersOn ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() =>
            updateProjectionSettings({
              convention: projectionSettings.convention === 'first-angle' ? 'third-angle' : 'first-angle',
            })
          }
          className="px-2 py-1 rounded text-[11px] font-mono font-semibold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
          title="Toggle First-Angle / Third-Angle Projection"
        >
          {projectionSettings.convention === 'first-angle' ? '1st°' : '3rd°'}
        </button>

        <button
          onClick={toggleMeasureMode}
          className={`${btnCls} ${measureMode ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
          title="Measure 3D Distance"
        >
          <Ruler className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setAnimationActive(!animationActive)}
          className={`${btnCls} ${animationActive ? 'bg-blue-500/20 text-blue-400' : ''}`}
          title="Step-by-Step Learning Mode"
        >
          <PlayCircle className="w-3.5 h-3.5" />
        </button>

        <div className="relative">
          <button onClick={() => setExportOpen((o) => !o)} className={btnCls} title="Export">
            <Download className="w-3.5 h-3.5" />
          </button>
          {exportOpen && (
            <div
              onMouseLeave={() => setExportOpen(false)}
              className="absolute right-0 mt-1 w-52 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 z-50 text-xs"
            >
              <button
                onClick={() => {
                  exportSVGElement(
                    workspaceTab === 'sheet' ? sheetSvgRef.current : frontSvgRef.current,
                    workspaceTab === 'sheet' ? 'drawing_sheet.svg' : 'front_view.svg'
                  );
                  setExportOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Export Current View (.svg)
              </button>
              <button
                onClick={() => {
                  exportSVGAsPNG(
                    workspaceTab === 'sheet' ? sheetSvgRef.current : frontSvgRef.current,
                    workspaceTab === 'sheet' ? 'drawing_sheet.png' : 'front_view.png'
                  );
                  setExportOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Export Current View (.png)
              </button>
              <button
                onClick={() => {
                  exportDrawingSheetPDF();
                  setExportOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Print / Save Sheet (PDF)
              </button>
              <button
                onClick={() => {
                  exportProjectAsJSON(exportProjectJSON());
                  setExportOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Export Project JSON (.json)
              </button>
            </div>
          )}
        </div>

        <button
          onClick={toggleRightSidebar}
          className={`${btnCls} ${!showRightSidebar ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold' : ''}`}
          title={showRightSidebar ? 'Hide Right Parameters Wall' : 'Show Right Parameters Wall'}
        >
          {showRightSidebar ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
          <span className="hidden 2xl:inline">{showRightSidebar ? 'Params' : 'Show Params'}</span>
        </button>

        <button
          onClick={handleToggleFullscreen}
          className={`${btnCls} ${appFullscreen ? 'bg-blue-600 text-white shadow-sm' : ''}`}
          title={appFullscreen ? 'Exit Full Screen' : 'Full Screen Platform (Zen Mode - Hide header)'}
        >
          {appFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        <button onClick={toggleTheme} className={btnCls} title="Toggle Theme">
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {user && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 max-w-[140px] truncate"
              title={`Logged in as ${user.name} (${user.email})`}
            >
              <UserIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate font-medium">{user.name}</span>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Do you want to log out of EG SIMULATOR?')) {
                  logout();
                }
              }}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-500 transition-colors"
              title="Logout / Exit Simulator"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
    </>
  );
};

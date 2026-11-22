import React, { useRef, useState } from 'react';
import {
  Box,
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
  Moon,
  PlayCircle,
  Redo2,
  RotateCcw,
  Ruler,
  Save,
  Sun,
  Undo2,
  User as UserIcon,
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
  } = useProjectStore();

  const { user, logout } = useAuthStore();
  const [exportOpen, setExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <header className="h-12 px-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none shrink-0 z-20 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 font-semibold text-sm tracking-tight text-slate-900 dark:text-white shrink-0">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white">
            <Box className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline">EG SIMULATOR</span>
          <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-blue-500/15 text-blue-500 hidden lg:inline">v4</span>
        </div>

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
  );
};

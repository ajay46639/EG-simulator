import React, { useState } from 'react';
import {
  Box,
  Circle,
  Eye,
  EyeOff,
  Layers,
  Minus,
  Plus,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useProjectStore } from '../state/useProjectStore';
import { ObjectCategory } from '../types/engineering';
import { PRESET_EXAMPLES } from '../engineering/presets';

export const LeftSidebar: React.FC = () => {
  const {
    objects,
    selectedObjectId,
    addObject,
    selectObject,
    removeObject,
    toggleObjectVisibility,
    loadPreset,
    exportProjectJSON,
    importProjectJSON,
    toggleLeftSidebar,
  } = useProjectStore();

  const [savedKeys, setSavedKeys] = useState<string[]>(() => {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith('engiview_proj_'));
    } catch {
      return [];
    }
  });

  const handleQuickSaveLocal = () => {
    const data = exportProjectJSON();
    const key = `engiview_proj_${Date.now()}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      setSavedKeys(Object.keys(localStorage).filter((k) => k.startsWith('engiview_proj_')));
    } catch {
      // ignore quota errors
    }
  };

  const handleLoadLocal = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) importProjectJSON(JSON.parse(raw));
    } catch {
      // ignore
    }
  };

  const categories: Array<{ cat: ObjectCategory; label: string; icon: React.ReactNode }> = [
    { cat: 'point', label: 'Point', icon: <Circle className="w-3.5 h-3.5" /> },
    { cat: 'line', label: 'Line', icon: <Minus className="w-3.5 h-3.5" /> },
    { cat: 'plane', label: 'Plane', icon: <Square className="w-3.5 h-3.5" /> },
    { cat: 'solid', label: 'Solid', icon: <Box className="w-3.5 h-3.5" /> },
    { cat: 'curve', label: 'Curve', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={toggleLeftSidebar}
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs md:relative md:inset-auto md:z-0 md:w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto select-none shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200 md:animate-none">
        {/* Mobile Drawer Header with Close Button */}
        <div className="flex md:hidden items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" />
            Scene & Features Wall
          </span>
          <button
            onClick={toggleLeftSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      {/* Create Object / Object Library */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Create Object
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {categories.map((c) => (
            <button
              key={c.cat}
              onClick={() => addObject(c.cat)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-blue-500/15 hover:text-blue-500 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Plus className="w-3 h-3 opacity-70" />
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Project Explorer / Objects */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Object Explorer ({objects.length})
          </h2>
        </div>
        {objects.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No objects in scene. Create one above.</p>
        ) : (
          <div className="space-y-1">
            {objects.map((obj) => {
              const selected = obj.id === selectedObjectId;
              return (
                <div
                  key={obj.id}
                  onClick={() => selectObject(obj.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                    selected
                      ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: obj.color }}
                    />
                    <span className="truncate font-medium">{obj.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleObjectVisibility(obj.id);
                      }}
                      className="p-1 hover:text-blue-400 opacity-75"
                      title="Toggle Visibility"
                    >
                      {obj.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeObject(obj.id);
                      }}
                      className="p-1 hover:text-red-400 opacity-75"
                      title="Delete Object"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preset Examples */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Preset Examples
        </h2>
        <div className="space-y-1.5">
          {PRESET_EXAMPLES.map((p) => (
            <button
              key={p.id}
              onClick={() => loadPreset(p.id)}
              className="w-full text-left p-2 rounded border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
            >
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {p.title}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Browser Saved Projects */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Saved Projects
          </h2>
          <button
            onClick={handleQuickSaveLocal}
            className="text-[10px] font-medium text-blue-500 hover:underline"
          >
            + Save Snapshot
          </button>
        </div>
        {savedKeys.length === 0 ? (
          <p className="text-[11px] text-slate-500">No browser snapshots saved yet.</p>
        ) : (
          <div className="space-y-1">
            {savedKeys.map((k) => {
              let label = k;
              try {
                const parsed = JSON.parse(localStorage.getItem(k) || '{}');
                if (parsed.name) label = parsed.name;
              } catch {
                // ignore
              }
              return (
                <button
                  key={k}
                  onClick={() => handleLoadLocal(k)}
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 truncate"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </aside>
    </>
  );
};

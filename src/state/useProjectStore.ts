import { create } from 'zustand';
import {
  AngleUnit,
  EngineeringObject,
  HelperLineVisibility,
  InputMode,
  LengthUnit,
  ObjectCategory,
  ProjectData,
  ProjectionSettings,
  ThemeMode,
  Vec3,
  WorkspaceTab,
} from '../types/engineering';
import { PRESET_EXAMPLES } from '../engineering/presets';

export type MaximizedPanel = 'none' | '3d' | 'front' | 'top' | 'side';

interface HistorySnapshot {
  objects: EngineeringObject[];
  selectedObjectId: string | null;
}

interface ProjectState {
  projectName: string;
  theme: ThemeMode;
  workspaceTab: WorkspaceTab;
  lengthUnit: LengthUnit;
  angleUnit: AngleUnit;
  inputMode: InputMode;
  objects: EngineeringObject[];
  selectedObjectId: string | null;
  selectedAltIndex: Record<string, number>;
  projectionSettings: ProjectionSettings;
  maximizedPanel: MaximizedPanel;
  cameraResetTrigger: number;

  past: HistorySnapshot[];
  future: HistorySnapshot[];

  animationActive: boolean;
  animationPlaying: boolean;
  animationStep: number;
  animationSpeed: number;

  measureMode: boolean;
  measurePoints: Vec3[];

  setProjectName: (name: string) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  toggleTheme: () => void;
  setLengthUnit: (u: LengthUnit) => void;
  setAngleUnit: (u: AngleUnit) => void;
  setInputMode: (m: InputMode) => void;
  setMaximizedPanel: (p: MaximizedPanel) => void;
  triggerCameraReset: () => void;

  addObject: (category: ObjectCategory) => void;
  updateObject: (id: string, updater: (obj: EngineeringObject) => EngineeringObject) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  toggleObjectVisibility: (id: string) => void;
  setSelectedAltIndex: (id: string, idx: number) => void;

  updateProjectionSettings: (patch: Partial<ProjectionSettings>) => void;
  updateHelperVisibility: (patch: Partial<HelperLineVisibility>) => void;

  undo: () => void;
  redo: () => void;

  setAnimationActive: (active: boolean) => void;
  setAnimationPlaying: (playing: boolean) => void;
  setAnimationStep: (step: number) => void;
  setAnimationSpeed: (speed: number) => void;

  toggleMeasureMode: () => void;
  addMeasurePoint: (p: Vec3) => void;
  clearMeasurePoints: () => void;

  newProject: () => void;
  loadPreset: (presetId: string) => void;
  exportProjectJSON: () => ProjectData;
  importProjectJSON: (data: ProjectData) => void;
}

const DEFAULT_HELPERS: HelperLineVisibility = {
  masterHelpers: true,
  projectors: true,
  locusLines: true,
  constructionArcs: true,
  trueLengthLines: true,
  traces: true,
  centerAxisLines: true,
  hiddenEdges: true,
  dimensions: true,
  labels: true,
  stageGuides: true,
};

const DEFAULT_SETTINGS: ProjectionSettings = {
  convention: 'first-angle',
  scaleRatio: 1,
  scaleLabel: '1:1',
  showHP: true,
  showVP: true,
  showXY: true,
  showProjectors: true,
  showHiddenLines: true,
  showDimensions: true,
  showLabels: true,
  showTraces: true,
  helpers: DEFAULT_HELPERS,
  hpOpacity: 0.22,
  vpOpacity: 0.22,
  hpColor: '#0ea5e9',
  vpColor: '#8b5cf6',
  cameraMode: 'perspective',
  sectionEnabled: false,
  sectionAxis: 'z',
  sectionOffset: 30,
  sectionAngle: 45,
  auxiliaryEnabled: false,
  auxiliaryAngle: 45,
  auxiliaryType: 'aip',
};

function createDefaultObject(category: ObjectCategory, count: number): EngineeringObject {
  const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  switch (category) {
    case 'point':
      return {
        id,
        name: `Point P${count}`,
        category: 'point',
        visible: true,
        color: '#f59e0b',
        params: { category: 'point', data: { label: `P${count}`, x: 40, distVP: 25, distHP: 35, quadrant: 'I' } },
      };
    case 'line':
      return {
        id,
        name: `Line AB${count}`,
        category: 'line',
        visible: true,
        color: '#3b82f6',
        params: {
          category: 'line',
          data: {
            labelStart: 'A',
            labelEnd: 'B',
            anchorType: 'endA',
            trueLength: 75,
            theta: 30,
            phi: 45,
            x1: 20,
            y1: 15,
            z1: 15,
          },
        },
      };
    case 'plane':
      return {
        id,
        name: `Plane ${count}`,
        category: 'plane',
        visible: true,
        color: '#10b981',
        params: {
          category: 'plane',
          data: {
            shape: 'regular_hexagon',
            restingOn: 'hp_edge',
            width: 25,
            theta: 45,
            stage3Angle: 60,
            stage3Ref: 'resting_edge',
            stage3IsApparent: true,
          },
        },
      };
    case 'solid':
      return {
        id,
        name: `Solid ${count}`,
        category: 'solid',
        visible: true,
        color: '#8b5cf6',
        params: {
          category: 'solid',
          data: {
            solidType: 'square_pyramid',
            restingOn: 'hp_base_edge',
            width: 40,
            height: 60,
            theta: 45,
            stage3Angle: 30,
            stage3Ref: 'axis',
            stage3IsApparent: true,
          },
        },
      };
    case 'curve':
      return {
        id,
        name: `Curve ${count}`,
        category: 'curve',
        visible: true,
        color: '#f97316',
        params: {
          category: 'curve',
          data: { curveType: 'helix', radius: 25, pitch: 20, turns: 2, centerX: 55, centerY: 40, centerZ: 15 },
        },
      };
  }
}

const initialObjects = PRESET_EXAMPLES[0].objects;

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectName: 'EG SIMULATOR v4.0 Beta',
  theme: 'light',
  workspaceTab: '4view',
  lengthUnit: 'mm',
  angleUnit: 'deg',
  inputMode: 'mixed',
  objects: initialObjects,
  selectedObjectId: initialObjects[0].id,
  selectedAltIndex: {},
  projectionSettings: DEFAULT_SETTINGS,
  maximizedPanel: 'none',
  cameraResetTrigger: 0,
  past: [],
  future: [],

  animationActive: false,
  animationPlaying: false,
  animationStep: 0,
  animationSpeed: 1800,

  measureMode: false,
  measurePoints: [],

  setProjectName: (projectName) => set({ projectName }),
  setWorkspaceTab: (workspaceTab) => set({ workspaceTab }),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', next === 'dark');
      return { theme: next };
    }),
  setLengthUnit: (lengthUnit) => set({ lengthUnit }),
  setAngleUnit: (angleUnit) => set({ angleUnit }),
  setInputMode: (inputMode) => set({ inputMode }),
  setMaximizedPanel: (maximizedPanel) => set({ maximizedPanel }),
  triggerCameraReset: () => set((s) => ({ cameraResetTrigger: s.cameraResetTrigger + 1 })),

  addObject: (category) =>
    set((s) => {
      const obj = createDefaultObject(category, s.objects.length + 1);
      return {
        past: [...s.past.slice(-29), { objects: s.objects, selectedObjectId: s.selectedObjectId }],
        future: [],
        objects: [...s.objects, obj],
        selectedObjectId: obj.id,
      };
    }),

  updateObject: (id, updater) =>
    set((s) => ({
      past: [...s.past.slice(-29), { objects: s.objects, selectedObjectId: s.selectedObjectId }],
      future: [],
      objects: s.objects.map((o) => (o.id === id ? updater(o) : o)),
    })),

  removeObject: (id) =>
    set((s) => {
      const filtered = s.objects.filter((o) => o.id !== id);
      return {
        past: [...s.past.slice(-29), { objects: s.objects, selectedObjectId: s.selectedObjectId }],
        future: [],
        objects: filtered,
        selectedObjectId: s.selectedObjectId === id ? (filtered[0]?.id ?? null) : s.selectedObjectId,
      };
    }),

  selectObject: (id) => set({ selectedObjectId: id, animationStep: 0 }),
  toggleObjectVisibility: (id) =>
    set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)) })),
  setSelectedAltIndex: (id, idx) =>
    set((s) => ({ selectedAltIndex: { ...s.selectedAltIndex, [id]: idx } })),

  updateProjectionSettings: (patch) =>
    set((s) => ({ projectionSettings: { ...s.projectionSettings, ...patch } })),

  updateHelperVisibility: (patch) =>
    set((s) => {
      const helpers = { ...s.projectionSettings.helpers, ...patch };
      const master = helpers.masterHelpers;
      return {
        projectionSettings: {
          ...s.projectionSettings,
          helpers,
          showProjectors: master && helpers.projectors,
          showHiddenLines: master && helpers.hiddenEdges,
          showDimensions: master && helpers.dimensions,
          showLabels: master && helpers.labels,
          showTraces: master && helpers.traces,
        },
      };
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [{ objects: s.objects, selectedObjectId: s.selectedObjectId }, ...s.future],
        objects: prev.objects,
        selectedObjectId: prev.selectedObjectId,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, { objects: s.objects, selectedObjectId: s.selectedObjectId }],
        future: s.future.slice(1),
        objects: next.objects,
        selectedObjectId: next.selectedObjectId,
      };
    }),

  setAnimationActive: (animationActive) => set({ animationActive, animationPlaying: false, animationStep: 0 }),
  setAnimationPlaying: (animationPlaying) => set({ animationPlaying }),
  setAnimationStep: (animationStep) => set({ animationStep }),
  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),

  toggleMeasureMode: () => set((s) => ({ measureMode: !s.measureMode, measurePoints: [] })),
  addMeasurePoint: (p) => set((s) => ({ measurePoints: s.measurePoints.length >= 2 ? [p] : [...s.measurePoints, p] })),
  clearMeasurePoints: () => set({ measurePoints: [] }),

  newProject: () =>
    set({
      projectName: 'Untitled Project',
      objects: [],
      selectedObjectId: null,
      past: [],
      future: [],
      animationActive: false,
      animationPlaying: false,
      animationStep: 0,
    }),

  loadPreset: (presetId) => {
    const preset = PRESET_EXAMPLES.find((p) => p.id === presetId);
    if (!preset) return;
    const cloned: EngineeringObject[] = JSON.parse(JSON.stringify(preset.objects));
    set({
      projectName: preset.title,
      objects: cloned,
      selectedObjectId: cloned[0]?.id ?? null,
      past: [],
      future: [],
      animationStep: 0,
      animationPlaying: false,
    });
  },

  exportProjectJSON: (): ProjectData => {
    const s = get();
    return {
      version: '4.0.0',
      name: s.projectName,
      lengthUnit: s.lengthUnit,
      angleUnit: s.angleUnit,
      projectionSettings: s.projectionSettings,
      objects: s.objects,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  importProjectJSON: (data: ProjectData) => {
    set({
      projectName: data.name || 'Imported Project',
      lengthUnit: data.lengthUnit || 'mm',
      angleUnit: data.angleUnit || 'deg',
      projectionSettings: {
        ...DEFAULT_SETTINGS,
        ...(data.projectionSettings || {}),
        helpers: { ...DEFAULT_HELPERS, ...(data.projectionSettings?.helpers || {}) },
      },
      objects: Array.isArray(data.objects) ? data.objects : [],
      selectedObjectId: data.objects?.[0]?.id ?? null,
      past: [],
      future: [],
      animationStep: 0,
      animationPlaying: false,
    });
  },
}));

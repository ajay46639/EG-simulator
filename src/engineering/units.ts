import { AngleUnit, LengthUnit, Quadrant, Vec3 } from '../types/engineering';

export const hasGlobalScale = true;

const LENGTH_TO_MM: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
};

export function toMM(value: number, unit: LengthUnit): number {
  return value * LENGTH_TO_MM[unit];
}

export function fromMM(valueMM: number, unit: LengthUnit): number {
  return valueMM / LENGTH_TO_MM[unit];
}

export function applyGlobalScale(realValueMM: number, scaleRatio = 1): number {
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) return realValueMM;
  return realValueMM * scaleRatio;
}

export function unapplyGlobalScale(drawingValueMM: number, scaleRatio = 1): number {
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) return drawingValueMM;
  return drawingValueMM / scaleRatio;
}

export function parseScaleRatio(spec: string): number {
  const cleaned = spec.trim();
  const parts = cleaned.split(':').map((s) => Number(s.trim()));
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && parts[0] > 0 && parts[1] > 0) {
    return parts[0] / parts[1];
  }
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

export function toDeg(value: number, unit: AngleUnit): number {
  return unit === 'rad' ? (value * 180) / Math.PI : value;
}

export function fromDeg(valueDeg: number, unit: AngleUnit): number {
  return unit === 'rad' ? (valueDeg * Math.PI) / 180 : valueDeg;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function formatNum(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return '—';
  const rounded = Math.abs(val) < 1e-9 ? 0 : val;
  return Number(rounded.toFixed(decimals)).toString();
}

export function detectQuadrant(p: Vec3, eps = 1e-6): Quadrant {
  const onHP = Math.abs(p.z) <= eps;
  const onVP = Math.abs(p.y) <= eps;
  if (onHP && onVP) return 'XY';
  if (onHP) return 'HP';
  if (onVP) return 'VP';
  if (p.z > 0 && p.y > 0) return 'I';
  if (p.z > 0 && p.y < 0) return 'II';
  if (p.z < 0 && p.y < 0) return 'III';
  return 'IV';
}

export function quadrantSigns(q: Quadrant): { signY: number; signZ: number } {
  switch (q) {
    case 'I':
      return { signY: 1, signZ: 1 };
    case 'II':
      return { signY: -1, signZ: 1 };
    case 'III':
      return { signY: -1, signZ: -1 };
    case 'IV':
      return { signY: 1, signZ: -1 };
    case 'HP':
      return { signY: 1, signZ: 0 };
    case 'VP':
      return { signY: 0, signZ: 1 };
    case 'XY':
      return { signY: 0, signZ: 0 };
  }
}

export function quadrantDescription(q: Quadrant): string {
  switch (q) {
    case 'I':
      return '1st Quadrant (Above HP, In front of VP)';
    case 'II':
      return '2nd Quadrant (Above HP, Behind VP)';
    case 'III':
      return '3rd Quadrant (Below HP, Behind VP)';
    case 'IV':
      return '4th Quadrant (Below HP, In front of VP)';
    case 'HP':
      return 'On Horizontal Plane (HP, Z = 0)';
    case 'VP':
      return 'On Vertical Plane (VP, Y = 0)';
    case 'XY':
      return 'On XY Reference Line (Y = 0, Z = 0)';
  }
}

export type LengthUnit = 'mm' | 'cm' | 'm' | 'in';
export type AngleUnit = 'deg' | 'rad';
export type ProjectionConvention = 'first-angle' | 'third-angle';
export type InputMode = 'parameter' | 'coordinate' | 'projection' | 'mixed';
export type ThemeMode = 'dark' | 'light';
export type WorkspaceTab = '4view' | 'sheet' | 'pictorial' | 'intersect' | 'curves' | 'scales';

export type ObjectCategory = 'point' | 'line' | 'plane' | 'solid' | 'curve';

export type Quadrant = 'I' | 'II' | 'III' | 'IV' | 'HP' | 'VP' | 'XY';

export type LineCase =
  | 'parallel_hp_vp'
  | 'parallel_hp_inclined_vp'
  | 'parallel_vp_inclined_hp'
  | 'inclined_both'
  | 'profile_plane'
  | 'perpendicular_hp'
  | 'perpendicular_vp'
  | 'contained_hp'
  | 'contained_vp'
  | 'contained_xy'
  | 'perpendicular_both';

export type LineAnchorType = 'endA' | 'endB' | 'midpoint';

export type PlaneShape =
  | 'square'
  | 'rectangle'
  | 'rhombus'
  | 'trapezium'
  | 'triangle'
  | 'equilateral_triangle'
  | 'isosceles_triangle'
  | 'right_triangle'
  | 'set_square_30_60'
  | 'set_square_45'
  | 'semicircle'
  | 'circle'
  | 'circular_plate_hole'
  | 'composite_rect_semicircle'
  | 'regular_pentagon'
  | 'regular_hexagon'
  | 'polygon';

export type PlaneRestingOn =
  | 'hp_edge'
  | 'hp_corner'
  | 'hp_diameter'
  | 'vp_edge'
  | 'vp_corner'
  | 'vp_diameter'
  | 'free';

export type PlaneStage3Ref = 'resting_edge' | 'diagonal_or_median';

export type SolidType =
  | 'tetrahedron'
  | 'cube'
  | 'cuboid'
  | 'octahedron'
  | 'prism'
  | 'triangular_prism'
  | 'square_prism'
  | 'pentagonal_prism'
  | 'hexagonal_prism'
  | 'hollow_prism'
  | 'pyramid'
  | 'triangular_pyramid'
  | 'square_pyramid'
  | 'pentagonal_pyramid'
  | 'hexagonal_pyramid'
  | 'cylinder'
  | 'hollow_cylinder'
  | 'cone'
  | 'sphere'
  | 'hemisphere'
  | 'frustum_cone'
  | 'frustum_pyramid';

export type SolidRestingOn =
  | 'hp_base'
  | 'vp_base'
  | 'axis_parallel_both'
  | 'hp_base_edge'
  | 'hp_base_corner'
  | 'hp_slant_face'
  | 'hp_slant_edge'
  | 'hp_rect_face'
  | 'hp_longer_edge'
  | 'hp_generator'
  | 'hp_freely_suspended'
  | 'cube_solid_diagonal_vertical'
  | 'vp_base_edge'
  | 'vp_base_corner'
  | 'vp_slant_face'
  | 'vp_slant_edge'
  | 'vp_generator';

export type SolidBaseOrientation =
  | 'auto'
  | 'edge_perp_vp'
  | 'edge_parallel_vp'
  | 'equally_inclined'
  | 'corner_right'
  | 'custom';

export type SolidStage3Ref = 'axis' | 'resting_edge';
export type ApexOrientation = 'away_from_vp' | 'towards_vp';
export type SectionPlaneType = 'aip' | 'avp' | 'horizontal' | 'frontal' | 'profile';
export type AuxiliaryPlaneType = 'aip' | 'avp';

export type CurveType =
  | 'circle'
  | 'arc'
  | 'ellipse'
  | 'spline'
  | 'helix'
  | 'polygon'
  | 'polyline';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  u: number;
  v: number;
}

export interface PointParams {
  label?: string;
  x?: number | null;
  y?: number | null;
  z?: number | null;
  distHP?: number | null;
  distVP?: number | null;
  distXY?: number | null;
  quadrant?: Quadrant | null;
}

export interface LineParams {
  labelStart?: string;
  labelEnd?: string;
  anchorType?: LineAnchorType;
  trueLength?: number | null;
  theta?: number | null; // true inclination with HP (deg)
  phi?: number | null; // true inclination with VP (deg)
  fvLength?: number | null;
  tvLength?: number | null;
  svLength?: number | null;
  alpha?: number | null; // apparent FV inclination with XY (deg)
  beta?: number | null; // apparent TV inclination with XY (deg)
  projectorDist?: number | null; // distance between end projectors |x2 - x1|
  x1?: number | null;
  y1?: number | null;
  z1?: number | null;
  x2?: number | null;
  y2?: number | null;
  z2?: number | null;
  h1?: number | null;
  d1?: number | null;
  h2?: number | null;
  d2?: number | null;
  quadrantA?: Quadrant | null;
  quadrantB?: Quadrant | null;
  midY?: number | null;
  midZ?: number | null;
  lineCase?: LineCase | null;
  // B5: Trace & Point-on-line constraints (N.D. Bhatt Ch. 10 W10-26/27/28)
  htDistVP?: number | null; // signed or positive dist of HT from VP (+ front, - behind)
  htSide?: 'front' | 'behind' | null;
  vtDistHP?: number | null; // signed or positive dist of VT from HP (+ above, - below)
  vtSide?: 'above' | 'below' | null;
  traceProjectorDist?: number | null; // horizontal distance |x_VT - x_HT|
  tracesCoincideOnXY?: boolean;
}

export interface PlaneParams {
  shape: PlaneShape;
  restingOn?: PlaneRestingOn;
  width?: number | null;
  length?: number | null;
  radius?: number | null;
  holeRadius?: number | null;
  sides?: number | null;
  theta?: number | null;
  phi?: number | null;
  stage3Angle?: number | null;
  stage3Ref?: PlaneStage3Ref;
  stage3IsApparent?: boolean;
  apparentSquareSide?: number | null;
  centerX?: number | null;
  centerY?: number | null;
  centerZ?: number | null;
  rotX?: number | null;
  rotY?: number | null;
  rotZ?: number | null;
  customVertices?: Vec3[];
}

export interface SolidParams {
  solidType: SolidType;
  restingOn?: SolidRestingOn;
  baseOrientation?: SolidBaseOrientation;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  radius?: number | null;
  innerRadius?: number | null;
  topRadius?: number | null;
  sides?: number | null;
  theta?: number | null;
  phi?: number | null;
  stage3Angle?: number | null;
  stage3Ref?: SolidStage3Ref;
  stage3IsApparent?: boolean;
  apexOrientation?: ApexOrientation;
  baseEdgeAngle?: number | null;
  centerX?: number | null;
  centerY?: number | null;
  centerZ?: number | null;
  rotX?: number | null;
  rotY?: number | null;
  rotZ?: number | null;
  sectionEnabled?: boolean;
  sectionPlaneType?: SectionPlaneType;
  sectionAngle?: number | null;
  sectionHeight?: number | null;
  sectionOffset?: number | null;
  showTrueShape?: boolean;
  showDevelopment?: boolean;
}

export interface CurveParams {
  curveType: CurveType;
  radius?: number | null;
  majorRadius?: number | null;
  minorRadius?: number | null;
  startAngle?: number | null;
  endAngle?: number | null;
  pitch?: number | null;
  turns?: number | null;
  sides?: number | null;
  centerX?: number | null;
  centerY?: number | null;
  centerZ?: number | null;
  rotX?: number | null;
  rotY?: number | null;
  rotZ?: number | null;
  controlPoints?: Vec3[];
}

export type ObjectParams =
  | { category: 'point'; data: PointParams }
  | { category: 'line'; data: LineParams }
  | { category: 'plane'; data: PlaneParams }
  | { category: 'solid'; data: SolidParams }
  | { category: 'curve'; data: CurveParams };

export interface EngineeringObject {
  id: string;
  name: string;
  category: ObjectCategory;
  visible: boolean;
  color: string;
  params: ObjectParams;
}

export type ConstraintStatus =
  | 'fully_determined'
  | 'underdetermined'
  | 'inconsistent'
  | 'multiple_solutions';

export interface SolutionAlternative {
  id: string;
  label: string;
  description: string;
  resolvedValues: Record<string, number | string>;
}

export interface SolverResult {
  status: ConstraintStatus;
  message: string;
  missingParams: Array<{ name: string; reason: string }>;
  inconsistencies: string[];
  alternatives: SolutionAlternative[];
  selectedAlternativeIndex: number;
  calculated: Record<string, number | string | Vec3 | null>;
  resolvedPoint?: Vec3;
  resolvedLine?: {
    p1: Vec3;
    p2: Vec3;
    trueLength: number;
    theta: number;
    phi: number;
    fvLength: number;
    tvLength: number;
    svLength: number;
    alpha: number;
    beta: number;
    projectorDist: number;
    ht: Vec3 | null;
    vt: Vec3 | null;
  };
  resolvedPlane?: {
    center: Vec3;
    area: number;
    perimeter: number;
    normal: Vec3;
    theta: number;
    phi: number;
    stage3Angle: number;
    apparentStage3Angle: number;
    usedLocus: boolean;
    fvWidth: number;
    tvHeight: number;
  };
  resolvedSolid?: {
    center: Vec3;
    volume: number;
    surfaceArea: number;
    axisStart: Vec3;
    axisEnd: Vec3;
    effectiveTheta: number;
    effectivePhi: number;
    stage2TiltDeg: number;
    stage3RotationDeg: number;
    apparentStage3Angle: number;
    usedLocus: boolean;
    slantHeight?: number;
    slantEdge?: number;
    semiVerticalAngle?: number;
  };
}

export interface Edge3D {
  start: Vec3;
  end: Vec3;
  kind?: 'solid' | 'center' | 'axis' | 'hidden';
  faceIndices?: number[];
  smooth?: boolean;
}

export interface Face3D {
  indices: number[];
  normal: Vec3;
}

export interface Label3D {
  text: string;
  position: Vec3;
  color?: string;
}

export interface SectionPlaneInfo {
  point: Vec3;
  normal: Vec3;
  type: SectionPlaneType;
  angle: number;
}

export interface MeshData {
  vertices: Vec3[];
  faces: Face3D[];
  edges: Edge3D[];
  points: Array<{ position: Vec3; label: string; color?: string }>;
  labels: Label3D[];
  traces?: {
    ht?: Vec3 | null;
    vt?: Vec3 | null;
    htLine?: [Vec3, Vec3] | null;
    vtLine?: [Vec3, Vec3] | null;
  };
  sectionPlane?: SectionPlaneInfo | null;
  boundingBox: {
    min: Vec3;
    max: Vec3;
  };
}

export interface ProjectedEdge2D {
  start: Vec2;
  end: Vec2;
  visible: boolean;
  kind: 'visible' | 'hidden' | 'center' | 'axis' | 'projector' | 'trace' | 'section';
}

export interface ProjectedPoint2D {
  pos: Vec2;
  label: string;
  color?: string;
}

export interface ProjectedViewData {
  view: 'front' | 'top' | 'side' | 'left_side' | 'right_side' | 'auxiliary';
  edges: ProjectedEdge2D[];
  points: ProjectedPoint2D[];
  labels: Array<{ pos: Vec2; text: string; color?: string }>;
  dimensions: Array<{
    from: Vec2;
    to: Vec2;
    text: string;
    offset?: number;
  }>;
}

export interface HelperLineVisibility {
  masterHelpers: boolean;
  projectors: boolean;
  locusLines: boolean;
  constructionArcs: boolean;
  trueLengthLines: boolean;
  traces: boolean;
  centerAxisLines: boolean;
  hiddenEdges: boolean;
  dimensions: boolean;
  labels: boolean;
  stageGuides: boolean;
}

export interface ProjectionSettings {
  convention: ProjectionConvention;
  scaleRatio: number; // e.g. 1 for 1:1, 0.004 for 1:250
  scaleLabel: string; // e.g. '1:1', '1:250'
  showHP: boolean;
  showVP: boolean;
  showXY: boolean;
  showProjectors: boolean;
  showHiddenLines: boolean;
  showDimensions: boolean;
  showLabels: boolean;
  showTraces: boolean;
  helpers: HelperLineVisibility;
  hpOpacity: number;
  vpOpacity: number;
  hpColor: string;
  vpColor: string;
  cameraMode: 'perspective' | 'orthographic';
  sectionEnabled: boolean;
  sectionAxis: 'x' | 'y' | 'z';
  sectionOffset: number;
  sectionAngle: number;
  auxiliaryEnabled: boolean;
  auxiliaryAngle: number;
  auxiliaryType?: AuxiliaryPlaneType;
}

export interface ProjectData {
  version: string;
  name: string;
  lengthUnit: LengthUnit;
  angleUnit: AngleUnit;
  projectionSettings: ProjectionSettings;
  objects: EngineeringObject[];
  createdAt: string;
  updatedAt: string;
}

import { EngineeringObject } from '../types/engineering';

export interface PresetExample {
  id: string;
  sheet: string;
  title: string;
  description: string;
  objects: EngineeringObject[];
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    id: 'bhatt_ch10_line_inclined',
    sheet: 'N.D. Bhatt Ch. 10 · Lines',
    title: 'Line AB (75mm, θ=45°, φ=30°, End B in HP)',
    description: 'End B in HP & 40mm front of VP. Full locus, compass arcs & H.T./V.T.',
    objects: [
      {
        id: 'obj_s3_q6',
        name: 'Line AB (Inclined Both)',
        category: 'line',
        visible: true,
        color: '#3b82f6',
        params: {
          category: 'line',
          data: {
            labelStart: 'A',
            labelEnd: 'B',
            anchorType: 'endB',
            trueLength: 75,
            theta: 45,
            phi: 30,
            x2: 90,
            y2: 40,
            z2: 0,
          },
        },
      },
    ],
  },
  {
    id: 'bhatt_ch10_profile_line',
    sheet: 'N.D. Bhatt Ch. 10 · Profile',
    title: 'Line AB in Profile Plane (θ=30°, φ=60°)',
    description: 'θ + φ = 90°: End projectors coincide; True Length appears in Side View.',
    objects: [
      {
        id: 'obj_prof_line',
        name: 'Profile Line (θ+φ=90°)',
        category: 'line',
        visible: true,
        color: '#f59e0b',
        params: {
          category: 'line',
          data: {
            labelStart: 'A',
            labelEnd: 'B',
            lineCase: 'profile_plane',
            trueLength: 70,
            theta: 30,
            phi: 60,
            x1: 45,
            y1: 15,
            z1: 10,
          },
        },
      },
    ],
  },
  {
    id: 'sheet3_q7_midpoint',
    sheet: 'N.D. Bhatt Ch. 10 · Midpoint',
    title: 'Line PQ (100mm, Midpoint in VP, Q3→Q1)',
    description: 'θ=30°, φ=45°, midpoint 20mm above HP in VP, P in Q3 & Q in Q1.',
    objects: [
      {
        id: 'obj_s3_q7',
        name: 'Line PQ (Midpoint)',
        category: 'line',
        visible: true,
        color: '#0ea5e9',
        params: {
          category: 'line',
          data: {
            labelStart: 'P',
            labelEnd: 'Q',
            anchorType: 'midpoint',
            trueLength: 100,
            theta: 30,
            phi: 45,
            x1: 30,
            midY: 0,
            midZ: 20,
          },
        },
      },
    ],
  },
  {
    id: 'sheet3_q10_projectors',
    sheet: 'Sheet 3 · Q10',
    title: 'Line AB (Projectors 50mm apart, Q1→Q3)',
    description: 'A: 20 above HP, 30 front VP; B: 70 below HP, 40 behind VP.',
    objects: [
      {
        id: 'obj_s3_q10',
        name: 'Line AB (Proj 50mm)',
        category: 'line',
        visible: true,
        color: '#ec4899',
        params: {
          category: 'line',
          data: {
            labelStart: 'A',
            labelEnd: 'B',
            projectorDist: 50,
            x1: 25,
            h1: 20,
            d1: 30,
            quadrantA: 'I',
            h2: 70,
            d2: 40,
            quadrantB: 'III',
          },
        },
      },
    ],
  },
  {
    id: 'sheet3_q11_apparent_beta',
    sheet: 'Sheet 3 · Q11',
    title: 'Line AB (TL=90, θ=45°, TV β=60°)',
    description: 'Uses apparent Top-View angle β=60° to solve true φ & Front View.',
    objects: [
      {
        id: 'obj_s3_q11',
        name: 'Line AB (β=60°)',
        category: 'line',
        visible: true,
        color: '#14b8a6',
        params: {
          category: 'line',
          data: {
            labelStart: 'A',
            labelEnd: 'B',
            trueLength: 90,
            theta: 45,
            beta: 60,
            x1: 20,
            y1: 12,
            z1: 0,
          },
        },
      },
    ],
  },
  {
    id: 'sheet4_q3_hexagon_3step',
    sheet: 'N.D. Bhatt Ch. 12 · Planes',
    title: 'Hexagon Lamina (3-Step: 45° HP, Edge 60° VP)',
    description: '25mm side in HP inclined 60° to VP, surface 45° to HP.',
    objects: [
      {
        id: 'obj_s4_q3',
        name: 'Hexagon (3-Step)',
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
      },
    ],
  },
  {
    id: 'bhatt_ch12_pentagon_locus',
    sheet: 'N.D. Bhatt Ch. 12 · Locus',
    title: 'Pentagon Corner in HP (θ=45°, True Median φ=30°)',
    description: 'Corner in HP, surface 45° to HP, median makes true 30° to VP (auto-computes β=45°).',
    objects: [
      {
        id: 'obj_pent_locus',
        name: 'Pentagon (True Locus)',
        category: 'plane',
        visible: true,
        color: '#22c55e',
        params: {
          category: 'plane',
          data: {
            shape: 'regular_pentagon',
            restingOn: 'hp_corner',
            width: 30,
            theta: 45,
            stage3Angle: 30,
            stage3Ref: 'diagonal_or_median',
            stage3IsApparent: false,
          },
        },
      },
    ],
  },
  {
    id: 'sheet4_q6_rect_square_fv',
    sheet: 'Sheet 4 · Q6',
    title: 'Rect Plate 60×30 (FV = 30mm Square)',
    description: 'Auto-solves φ=60° from apparent square FV; shorter edge 30° to HP.',
    objects: [
      {
        id: 'obj_s4_q6',
        name: 'Rect Plate 60×30',
        category: 'plane',
        visible: true,
        color: '#f59e0b',
        params: {
          category: 'plane',
          data: {
            shape: 'rectangle',
            restingOn: 'vp_edge',
            width: 60,
            length: 30,
            apparentSquareSide: 30,
            stage3Angle: 30,
            stage3Ref: 'resting_edge',
          },
        },
      },
    ],
  },
  {
    id: 'sheet5_q13_sq_prism_3step',
    sheet: 'N.D. Bhatt Ch. 13 · Prisms',
    title: 'Square Prism (Base Edge on HP, θ=45°, True φ=30°)',
    description: 'Base 40mm, H=65mm; axis 45° to HP and true 30° to VP (auto locus β=45°).',
    objects: [
      {
        id: 'obj_s5_q13',
        name: 'Square Prism 3-Step',
        category: 'solid',
        visible: true,
        color: '#8b5cf6',
        params: {
          category: 'solid',
          data: {
            solidType: 'square_prism',
            restingOn: 'hp_base_edge',
            width: 40,
            height: 65,
            theta: 45,
            stage3Angle: 30,
            stage3Ref: 'axis',
            stage3IsApparent: false,
          },
        },
      },
    ],
  },
  {
    id: 'bhatt_ch13_pent_pyr_face',
    sheet: 'N.D. Bhatt Ch. 13 · Pyramids',
    title: 'Pentagonal Pyramid on Triangular Face (HP)',
    description: 'Rests flat on one triangular slant face on HP; axis inclined 30° to VP in plan.',
    objects: [
      {
        id: 'obj_pent_face',
        name: 'Pent. Pyramid (Slant Face)',
        category: 'solid',
        visible: true,
        color: '#a855f7',
        params: {
          category: 'solid',
          data: {
            solidType: 'pentagonal_pyramid',
            restingOn: 'hp_slant_face',
            width: 30,
            height: 65,
            stage3Angle: 30,
            stage3Ref: 'axis',
            stage3IsApparent: true,
          },
        },
      },
    ],
  },
  {
    id: 'bhatt_ch13_suspended_pyr',
    sheet: 'N.D. Bhatt Ch. 13 · Suspended',
    title: 'Freely Suspended Square Pyramid (Base Corner)',
    description: 'Suspended from a base corner: CG hangs vertically below suspension point.',
    objects: [
      {
        id: 'obj_susp_pyr',
        name: 'Suspended Sq Pyramid',
        category: 'solid',
        visible: true,
        color: '#06b6d4',
        params: {
          category: 'solid',
          data: {
            solidType: 'square_pyramid',
            restingOn: 'hp_freely_suspended',
            width: 35,
            height: 65,
            stage3Angle: 45,
            stage3Ref: 'axis',
            stage3IsApparent: true,
          },
        },
      },
    ],
  },
  {
    id: 'bhatt_ch13_cube_diagonal',
    sheet: 'N.D. Bhatt Ch. 13 · Cube',
    title: 'Cube (Solid Diagonal ⊥ HP → Hexagonal TV)',
    description: 'Classic N.D. Bhatt problem: Cube resting on corner with solid diagonal vertical.',
    objects: [
      {
        id: 'obj_cube_diag',
        name: 'Cube (Solid Diag ⊥ HP)',
        category: 'solid',
        visible: true,
        color: '#3b82f6',
        params: {
          category: 'solid',
          data: {
            solidType: 'cube',
            restingOn: 'cube_solid_diagonal_vertical',
            width: 45,
          },
        },
      },
    ],
  },
  {
    id: 'sheet5_q12_cone_generator',
    sheet: 'N.D. Bhatt Ch. 13 · Cone',
    title: 'Cone Lying on Generator on HP (Ø70, H=90)',
    description: 'Generator lies flat on HP (Z=0), apex touching HP, plan of axis 45° to VP.',
    objects: [
      {
        id: 'obj_s5_q12',
        name: 'Cone on Generator',
        category: 'solid',
        visible: true,
        color: '#0ea5e9',
        params: {
          category: 'solid',
          data: {
            solidType: 'cone',
            restingOn: 'hp_generator',
            radius: 35,
            height: 90,
            stage3Angle: 45,
            stage3Ref: 'axis',
            stage3IsApparent: true,
          },
        },
      },
    ],
  },
  {
    id: 'egml_section_dev_pyramid',
    sheet: 'N.D. Bhatt Ch. 14 & 15',
    title: 'Sectioned Square Pyramid + True Shape + Dev',
    description: 'Cut by 45° AIP through axis midpoint with clipped hatching, True Shape & radial dev.',
    objects: [
      {
        id: 'obj_egml_dev',
        name: 'Square Pyramid (Cut + Dev)',
        category: 'solid',
        visible: true,
        color: '#ec4899',
        params: {
          category: 'solid',
          data: {
            solidType: 'square_pyramid',
            restingOn: 'hp_base',
            width: 45,
            height: 65,
            theta: 90,
            sectionEnabled: true,
            sectionPlaneType: 'aip',
            sectionAngle: 45,
            sectionHeight: 32,
            showTrueShape: true,
            showDevelopment: true,
          },
        },
      },
    ],
  },
  {
    id: 'bhatt_ch14_section_cylinder',
    sheet: 'N.D. Bhatt Ch. 14 & 15',
    title: 'Sectioned Cylinder (AIP 45° + Ellipse + Dev)',
    description: 'Cylinder cut by 45° AIP showing elliptical True Shape & sinusoidal development.',
    objects: [
      {
        id: 'obj_sec_cyl',
        name: 'Cylinder (AIP 45° + Dev)',
        category: 'solid',
        visible: true,
        color: '#10b981',
        params: {
          category: 'solid',
          data: {
            solidType: 'cylinder',
            restingOn: 'hp_base',
            radius: 25,
            height: 70,
            theta: 90,
            sectionEnabled: true,
            sectionPlaneType: 'aip',
            sectionAngle: 45,
            sectionHeight: 35,
            showTrueShape: true,
            showDevelopment: true,
          },
        },
      },
    ],
  },
];

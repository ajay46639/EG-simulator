import { ObjectCategory, SolverResult } from '../types/engineering';

export interface AnimationStep {
  stepNumber: number;
  title: string;
  explanation: string;
  showPlanes: boolean;
  showObject: boolean;
  showTrueLength: boolean;
  showProjectors: boolean;
  showFrontView: boolean;
  showTopView: boolean;
  showSideView: boolean;
  showDimensions: boolean;
  showAngles: boolean;
}

export function getAnimationSteps(
  category: ObjectCategory,
  solved?: SolverResult
): AnimationStep[] {
  if (category === 'point') {
    const p = solved?.resolvedPoint;
    const coords = p ? `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})` : '';
    return [
      {
        stepNumber: 1,
        title: 'Establish Reference Planes',
        explanation:
          'Set up the Horizontal Plane (HP, Z=0), Vertical Plane (VP, Y=0), and their intersection reference line XY.',
        showPlanes: true,
        showObject: false,
        showTrueLength: false,
        showProjectors: false,
        showFrontView: false,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 2,
        title: 'Locate 3D Point',
        explanation: `Place the point ${coords} in 3D space using its distances from HP (Z) and VP (Y).`,
        showPlanes: true,
        showObject: true,
        showTrueLength: false,
        showProjectors: false,
        showFrontView: false,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 3,
        title: 'Drop Perpendicular Projectors',
        explanation:
          'Draw perpendicular projection rays from the 3D point onto VP (along Y) and HP (along Z).',
        showPlanes: true,
        showObject: true,
        showTrueLength: false,
        showProjectors: true,
        showFrontView: false,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 4,
        title: 'Generate Front View (Elevation)',
        explanation:
          "Mark the Front View p' on VP at height Z above/below the XY reference line.",
        showPlanes: true,
        showObject: true,
        showTrueLength: false,
        showProjectors: true,
        showFrontView: true,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 5,
        title: 'Generate Top View (Plan)',
        explanation:
          'Mark the Top View p on HP at distance Y in front of/behind VP, then unfold HP 90° around XY.',
        showPlanes: true,
        showObject: true,
        showTrueLength: false,
        showProjectors: true,
        showFrontView: true,
        showTopView: true,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 6,
        title: 'Complete Side View & Dimensions',
        explanation:
          "Generate the Side View p'' on the Profile Plane and display coordinate dimensions.",
        showPlanes: true,
        showObject: true,
        showTrueLength: true,
        showProjectors: true,
        showFrontView: true,
        showTopView: true,
        showSideView: true,
        showDimensions: true,
        showAngles: true,
      },
    ];
  }

  if (category === 'line') {
    const rl = solved?.resolvedLine;
    return [
      {
        stepNumber: 1,
        title: 'Establish Reference Planes (HP, VP, XY)',
        explanation:
          'Initialize the Horizontal Plane (HP), Vertical Plane (VP), and XY intersection line.',
        showPlanes: true,
        showObject: false,
        showTrueLength: false,
        showProjectors: false,
        showFrontView: false,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 2,
        title: 'Construct Original 3D Line',
        explanation: rl
          ? `Position the 3D line AB with True Length ${rl.trueLength.toFixed(1)} inclined at θ=${rl.theta.toFixed(1)}° to HP and φ=${rl.phi.toFixed(1)}° to VP.`
          : 'Position the 3D line AB in space according to its true length and inclinations.',
        showPlanes: true,
        showObject: true,
        showTrueLength: true,
        showProjectors: false,
        showFrontView: false,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 3,
        title: 'Project Endpoints with Projectors',
        explanation:
          'Drop perpendicular projectors from both endpoints A and B onto VP and HP.',
        showPlanes: true,
        showObject: true,
        showTrueLength: true,
        showProjectors: true,
        showFrontView: false,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 4,
        title: 'Generate Front View (a′b′)',
        explanation: rl
          ? `Project onto VP to obtain Front View a'b' of apparent length ${rl.fvLength.toFixed(1)} (L·cos φ).`
          : "Project onto VP to obtain the Front View a'b'.",
        showPlanes: true,
        showObject: true,
        showTrueLength: true,
        showProjectors: true,
        showFrontView: true,
        showTopView: false,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 5,
        title: 'Generate Top View (ab)',
        explanation: rl
          ? `Project onto HP to obtain Top View ab of apparent length ${rl.tvLength.toFixed(1)} (L·cos θ).`
          : 'Project onto HP to obtain the Top View ab.',
        showPlanes: true,
        showObject: true,
        showTrueLength: true,
        showProjectors: true,
        showFrontView: true,
        showTopView: true,
        showSideView: false,
        showDimensions: false,
        showAngles: false,
      },
      {
        stepNumber: 6,
        title: 'Calculate Projected Lengths & Apparent Angles',
        explanation: rl
          ? `Display Side View, projected lengths, and apparent inclinations α=${rl.alpha.toFixed(1)}° (FV) and β=${rl.beta.toFixed(1)}° (TV).`
          : 'Display Side View, projected lengths, and final apparent inclinations.',
        showPlanes: true,
        showObject: true,
        showTrueLength: true,
        showProjectors: true,
        showFrontView: true,
        showTopView: true,
        showSideView: true,
        showDimensions: true,
        showAngles: true,
      },
    ];
  }

  // Planes, Solids, Curves
  const label = category === 'plane' ? 'Lamina / Plane' : category === 'solid' ? '3D Solid' : 'Curve';
  return [
    {
      stepNumber: 1,
      title: 'Establish Reference Planes',
      explanation: 'Set up HP, VP, and the XY reference line.',
      showPlanes: true,
      showObject: false,
      showTrueLength: false,
      showProjectors: false,
      showFrontView: false,
      showTopView: false,
      showSideView: false,
      showDimensions: false,
      showAngles: false,
    },
    {
      stepNumber: 2,
      title: `Construct ${label} in 3D`,
      explanation: `Build the ${label} from its true dimensions and apply its inclinations to HP and VP.`,
      showPlanes: true,
      showObject: true,
      showTrueLength: true,
      showProjectors: false,
      showFrontView: false,
      showTopView: false,
      showSideView: false,
      showDimensions: false,
      showAngles: false,
    },
    {
      stepNumber: 3,
      title: 'Cast Corner Projectors',
      explanation: 'Project key vertices and edges perpendicularly onto VP and HP.',
      showPlanes: true,
      showObject: true,
      showTrueLength: true,
      showProjectors: true,
      showFrontView: false,
      showTopView: false,
      showSideView: false,
      showDimensions: false,
      showAngles: false,
    },
    {
      stepNumber: 4,
      title: 'Generate Front & Top Orthographic Views',
      explanation: 'Compute visible and hidden edges for Elevation (VP) and Plan (HP).',
      showPlanes: true,
      showObject: true,
      showTrueLength: true,
      showProjectors: true,
      showFrontView: true,
      showTopView: true,
      showSideView: false,
      showDimensions: false,
      showAngles: false,
    },
    {
      stepNumber: 5,
      title: 'Generate Side View & Dimensions',
      explanation: 'Complete Profile Plane projection and annotate key dimensions.',
      showPlanes: true,
      showObject: true,
      showTrueLength: true,
      showProjectors: true,
      showFrontView: true,
      showTopView: true,
      showSideView: true,
      showDimensions: true,
      showAngles: true,
    },
  ];
}

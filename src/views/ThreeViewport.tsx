import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  EngineeringObject,
  MeshData,
  ProjectionSettings,
  SectionPlaneInfo,
  SolverResult,
  Vec3,
} from '../types/engineering';
import { AnimationStep } from '../animations/stepEngine';

/**
 * Convert engineering world coordinates (X=right, Y=depth/front of VP, Z=vertical/above HP)
 * into Three.js Y-up coordinates [X, Z, Y].
 */
function toThree(p: Vec3): [number, number, number] {
  return [p.x, p.z, p.y];
}

interface ThreeViewportProps {
  items: Array<{ obj: EngineeringObject; solved: SolverResult; mesh: MeshData }>;
  selectedId: string | null;
  settings: ProjectionSettings;
  theme: 'dark' | 'light';
  cameraResetTrigger: number;
  activeStep: AnimationStep | null;
  measureMode: boolean;
  measurePoints: Vec3[];
  onSelectObject: (id: string) => void;
  onMeasureClick: (p: Vec3) => void;
}

const CameraController: React.FC<{ resetTrigger: number }> = ({ resetTrigger }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (resetTrigger > 0) {
      camera.position.set(160, 120, 160);
      camera.lookAt(55, 25, 40);
      if (controlsRef.current) {
        controlsRef.current.target.set(55, 25, 40);
        controlsRef.current.update();
      }
    }
  }, [resetTrigger, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[55, 25, 40]}
      enableDamping
      dampingFactor={0.08}
    />
  );
};

const SectionPlaneMesh: React.FC<{ info: SectionPlaneInfo }> = ({ info }) => {
  const quat = useMemo(() => {
    const nThree = new THREE.Vector3(info.normal.x, info.normal.z, info.normal.y).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nThree);
    return q;
  }, [info.normal]);

  return (
    <mesh position={toThree(info.point)} quaternion={quat}>
      <planeGeometry args={[120, 120]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

const ReferencePlanes: React.FC<{ settings: ProjectionSettings; showPlanes: boolean }> = ({
  settings,
  showPlanes,
}) => {
  if (!showPlanes) return null;

  return (
    <group>
      {/* Horizontal Plane (HP: Z_eng = 0 -> Y_three = 0) */}
      {settings.showHP && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, 0, 0]}>
          <planeGeometry args={[260, 260]} />
          <meshStandardMaterial
            color={settings.hpColor}
            transparent
            opacity={settings.hpOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Vertical Plane (VP: Y_eng = 0 -> Z_three = 0) */}
      {settings.showVP && (
        <mesh position={[50, 0, 0]}>
          <planeGeometry args={[260, 220]} />
          <meshStandardMaterial
            color={settings.vpColor}
            transparent
            opacity={settings.vpOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* XY Reference Line (intersection of HP & VP) */}
      {settings.showXY && (
        <group>
          <Line
            points={[
              [-80, 0, 0],
              [180, 0, 0],
            ]}
            color="#f59e0b"
            lineWidth={2.5}
          />
          <Html position={[-85, 2, 0]} center>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-900/80 px-1 rounded">
              X
            </span>
          </Html>
          <Html position={[185, 2, 0]} center>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-900/80 px-1 rounded">
              Y
            </span>
          </Html>
        </group>
      )}

      {/* Plane Labels */}
      {settings.showHP && settings.showLabels && (
        <Html position={[160, 1, 110]} center>
          <span className="text-[10px] font-mono font-semibold text-sky-400 bg-slate-900/75 px-1.5 py-0.5 rounded border border-sky-500/30">
            HP (Z=0)
          </span>
        </Html>
      )}
      {settings.showVP && settings.showLabels && (
        <Html position={[160, 92, 2]} center>
          <span className="text-[10px] font-mono font-semibold text-violet-400 bg-slate-900/75 px-1.5 py-0.5 rounded border border-violet-500/30">
            VP (Y=0)
          </span>
        </Html>
      )}

      {/* Engineering Coordinate Axes Triad at Origin */}
      <Line points={[[0, 0, 0], [35, 0, 0]]} color="#ef4444" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, 35]]} color="#22c55e" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 35, 0]]} color="#3b82f6" lineWidth={2} />
    </group>
  );
};

const Object3DMesh: React.FC<{
  obj: EngineeringObject;
  mesh: MeshData;
  isSelected: boolean;
  settings: ProjectionSettings;
  activeStep: AnimationStep | null;
  measureMode: boolean;
  onSelect: () => void;
  onMeasureClick: (p: Vec3) => void;
}> = ({
  obj,
  mesh,
  isSelected,
  settings,
  activeStep,
  measureMode,
  onSelect,
  onMeasureClick,
}) => {
  const showObj = activeStep ? activeStep.showObject : true;
  const showProj = activeStep ? activeStep.showProjectors : settings.showProjectors;
  const showFV = activeStep ? activeStep.showFrontView : true;
  const showTV = activeStep ? activeStep.showTopView : true;
  const showLabels = activeStep ? activeStep.showDimensions : settings.showLabels;

  const faceGeometry = useMemo(() => {
    if (mesh.faces.length === 0) return null;
    const positions: number[] = [];
    for (const f of mesh.faces) {
      for (const idx of f.indices) {
        const v = mesh.vertices[idx];
        const t = toThree(v);
        positions.push(t[0], t[1], t[2]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [mesh]);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        if (!measureMode) onSelect();
      }}
    >
      {/* 3D Object Geometry */}
      {showObj && (
        <>
          {faceGeometry && (
            <mesh geometry={faceGeometry}>
              <meshStandardMaterial
                color={obj.color}
                transparent
                opacity={isSelected ? 0.65 : 0.45}
                side={THREE.DoubleSide}
                roughness={0.4}
                metalness={0.1}
              />
            </mesh>
          )}

          {mesh.edges
            .filter((e) => !e.smooth)
            .map((e, i) => (
              <Line
                key={i}
                points={[toThree(e.start), toThree(e.end)]}
                color={e.kind === 'axis' ? '#f59e0b' : isSelected ? '#ffffff' : obj.color}
                lineWidth={e.kind === 'axis' ? 1.5 : isSelected ? 2.2 : 1.8}
                dashed={e.kind === 'axis'}
                dashSize={4}
                gapSize={2}
              />
            ))}

          {mesh.sectionPlane && <SectionPlaneMesh info={mesh.sectionPlane} />}

          {mesh.points.map((pt, i) => (
            <group key={i} position={toThree(pt.position)}>
              <mesh
                onClick={(e) => {
                  if (measureMode) {
                    e.stopPropagation();
                    onMeasureClick(pt.position);
                  }
                }}
              >
                <sphereGeometry args={[1.8, 14, 14]} />
                <meshStandardMaterial color={pt.color || obj.color} />
              </mesh>
              {showLabels && mesh.points.length <= 12 && (
                <Html position={[0, 4, 0]} center>
                  <span className="text-[10px] font-mono font-bold text-white bg-slate-900/85 px-1 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                    {pt.label}
                  </span>
                </Html>
              )}
            </group>
          ))}
        </>
      )}

      {/* 3D Projectors onto VP and HP */}
      {showObj &&
        showProj &&
        mesh.points.map((pt, i) => {
          const vpPt = { x: pt.position.x, y: 0, z: pt.position.z };
          const hpPt = { x: pt.position.x, y: pt.position.y, z: 0 };
          return (
            <group key={`proj_${i}`}>
              <Line
                points={[toThree(pt.position), toThree(vpPt)]}
                color="#94a3b8"
                lineWidth={0.8}
                dashed
                dashSize={2.5}
                gapSize={2}
              />
              <Line
                points={[toThree(pt.position), toThree(hpPt)]}
                color="#94a3b8"
                lineWidth={0.8}
                dashed
                dashSize={2.5}
                gapSize={2}
              />
            </group>
          );
        })}

      {/* Projected Front View on VP (Y = 0) */}
      {showFV &&
        mesh.edges
          .filter((e) => e.kind !== 'axis' && !e.smooth)
          .map((e, i) => (
            <Line
              key={`fv_e_${i}`}
              points={[
                toThree({ x: e.start.x, y: 0, z: e.start.z }),
                toThree({ x: e.end.x, y: 0, z: e.end.z }),
              ]}
              color="#a78bfa"
              lineWidth={1.6}
            />
          ))}

      {/* Projected Top View on HP (Z = 0) */}
      {showTV &&
        mesh.edges
          .filter((e) => e.kind !== 'axis' && !e.smooth)
          .map((e, i) => (
            <Line
              key={`tv_e_${i}`}
              points={[
                toThree({ x: e.start.x, y: e.start.y, z: 0 }),
                toThree({ x: e.end.x, y: e.end.y, z: 0 }),
              ]}
              color="#38bdf8"
              lineWidth={1.6}
            />
          ))}

      {/* Traces (HT on HP, VT on VP) */}
      {settings.showTraces && mesh.traces?.ht && (
        <group position={toThree(mesh.traces.ht)}>
          <mesh>
            <sphereGeometry args={[2, 12, 12]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          <Html position={[0, 4, 0]} center>
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-slate-900/80 px-1 rounded">
              H.T.
            </span>
          </Html>
        </group>
      )}
      {settings.showTraces && mesh.traces?.vt && (
        <group position={toThree(mesh.traces.vt)}>
          <mesh>
            <sphereGeometry args={[2, 12, 12]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
          <Html position={[0, 4, 0]} center>
            <span className="text-[10px] font-mono font-bold text-pink-300 bg-slate-900/80 px-1 rounded">
              V.T.
            </span>
          </Html>
        </group>
      )}
    </group>
  );
};

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  items,
  selectedId,
  settings,
  theme,
  cameraResetTrigger,
  activeStep,
  measureMode,
  measurePoints,
  onSelectObject,
  onMeasureClick,
}) => {
  const showPlanes = activeStep ? activeStep.showPlanes : true;

  return (
    <div className="w-full h-full relative">
      <Canvas shadows dpr={[1, 2]}>
        <color attach="background" args={[theme === 'dark' ? '#0b1120' : '#f1f5f9']} />

        {settings.cameraMode === 'perspective' ? (
          <PerspectiveCamera makeDefault position={[160, 120, 160]} fov={42} near={0.5} far={2000} />
        ) : (
          <OrthographicCamera makeDefault position={[160, 120, 160]} zoom={3.2} near={-500} far={2000} />
        )}

        <ambientLight intensity={0.75} />
        <directionalLight position={[120, 200, 100]} intensity={1.1} />
        <directionalLight position={[-100, -80, -100]} intensity={0.4} />

        <gridHelper
          args={[260, 26, theme === 'dark' ? '#334155' : '#cbd5e1', theme === 'dark' ? '#1e293b' : '#e2e8f0']}
          position={[50, -0.05, 0]}
        />

        <ReferencePlanes settings={settings} showPlanes={showPlanes} />

        {items
          .filter((it) => it.obj.visible)
          .map(({ obj, mesh }) => (
            <Object3DMesh
              key={obj.id}
              obj={obj}
              mesh={mesh}
              isSelected={obj.id === selectedId}
              settings={settings}
              activeStep={activeStep}
              measureMode={measureMode}
              onSelect={() => onSelectObject(obj.id)}
              onMeasureClick={onMeasureClick}
            />
          ))}

        {/* Measurement Line */}
        {measurePoints.length === 2 && (
          <Line
            points={[toThree(measurePoints[0]), toThree(measurePoints[1])]}
            color="#22c55e"
            lineWidth={2.5}
          />
        )}

        <CameraController resetTrigger={cameraResetTrigger} />
      </Canvas>

      {/* Measurement Overlay */}
      {measureMode && (
        <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs px-2.5 py-1.5 rounded font-mono">
          {measurePoints.length === 0 && 'Measure: Click two 3D points on objects'}
          {measurePoints.length === 1 && 'Measure: Click second point...'}
          {measurePoints.length === 2 && (
            <span>
              Distance:{' '}
              {Math.hypot(
                measurePoints[1].x - measurePoints[0].x,
                measurePoints[1].y - measurePoints[0].y,
                measurePoints[1].z - measurePoints[0].z
              ).toFixed(2)}{' '}
              mm
            </span>
          )}
        </div>
      )}
    </div>
  );
};

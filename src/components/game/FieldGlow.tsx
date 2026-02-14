import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * A single soft glow patch using a custom shader for smooth radial falloff.
 * No hard edges — fades from center to transparent.
 */
function GlowPatch({
  position,
  size = [20, 20],
  color = '#fff8e1',
  intensity = 0.08,
  rotation = 0,
}: {
  position: [number, number, number];
  size?: [number, number];
  color?: string;
  intensity?: number;
  rotation?: number;
}) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          // Smooth cubic falloff — no hard edge
          float falloff = 1.0 - smoothstep(0.0, 1.0, dist);
          falloff = falloff * falloff; // extra softness
          gl_FragColor = vec4(uColor, falloff * uIntensity);
        }
      `,
    });
  }, [color, intensity]);

  return (
    <mesh
      rotation={[-Math.PI / 2, rotation, 0]}
      position={position}
      material={material}
    >
      <planeGeometry args={size} />
    </mesh>
  );
}

/**
 * Volumetric light cone from a tower position toward the field.
 * Creates an elongated transparent cone shape.
 */
function LightCone({
  from,
  target,
  color = '#fff8e1',
  opacity = 0.015,
}: {
  from: [number, number, number];
  target: [number, number, number];
  color?: string;
  opacity?: number;
}) {
  const coneRef = React.useRef<THREE.Mesh>(null);

  const { conePosition, coneRotation, height } = useMemo(() => {
    const fromVec = new THREE.Vector3(...from);
    const targetVec = new THREE.Vector3(...target);
    const dir = new THREE.Vector3().subVectors(targetVec, fromVec);
    const h = dir.length();
    const mid = new THREE.Vector3().addVectors(fromVec, targetVec).multiplyScalar(0.5);

    dir.normalize();
    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quat.setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);

    return {
      conePosition: [mid.x, mid.y, mid.z] as [number, number, number],
      coneRotation: euler,
      height: h,
    };
  }, [from, target]);

  return (
    <mesh ref={coneRef} position={conePosition} rotation={coneRotation}>
      <coneGeometry args={[18, height, 16, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function FieldGlow() {
  return (
    <group>
      {/* === Large atmospheric wash layers === */}
      {/* Full-field ambient wash — very wide, very subtle */}
      <GlowPatch position={[0, -0.04, -15]} size={[120, 100]} color="#fff8e1" intensity={0.025} />

      {/* Infield warm concentration */}
      <GlowPatch position={[0, -0.045, -5]} size={[50, 45]} color="#fffde8" intensity={0.05} />
      <GlowPatch position={[0, -0.048, -5]} size={[30, 28]} color="#fffff0" intensity={0.06} />

      {/* Home plate hotspot — brightest area */}
      <GlowPatch position={[0, -0.05, 1]} size={[12, 10]} color="#ffffff" intensity={0.08} />

      {/* Mound area glow */}
      <GlowPatch position={[0, -0.05, -18.4]} size={[14, 12]} color="#fffff0" intensity={0.065} />

      {/* === Directional light spills from towers (asymmetric) === */}
      {/* Right-field tower spill */}
      <GlowPatch position={[20, -0.042, -25]} size={[45, 50]} color="#fff8e1" intensity={0.03} rotation={0.3} />
      {/* Left-field tower spill */}
      <GlowPatch position={[-20, -0.042, -25]} size={[45, 50]} color="#fff8e1" intensity={0.03} rotation={-0.3} />
      {/* Near-right tower spill */}
      <GlowPatch position={[15, -0.042, 0]} size={[35, 30]} color="#ffeedd" intensity={0.025} rotation={0.15} />
      {/* Near-left tower spill */}
      <GlowPatch position={[-15, -0.042, 0]} size={[35, 30]} color="#ffeedd" intensity={0.025} rotation={-0.15} />

      {/* === Volumetric light cones from towers === */}
      <LightCone from={[60, 38, -80]} target={[10, 0, -15]} opacity={0.012} />
      <LightCone from={[-60, 38, -80]} target={[-10, 0, -15]} opacity={0.012} />
      <LightCone from={[45, 38, 20]} target={[5, 0, -5]} opacity={0.01} />
      <LightCone from={[-45, 38, 20]} target={[-5, 0, -5]} opacity={0.01} />

      {/* === Elevated fill lights for natural illumination === */}
      <pointLight position={[0, 12, -10]} intensity={20} distance={80} color="#fff8e1" decay={1.8} />
      <pointLight position={[0, 6, 2]} intensity={12} distance={35} color="#fffff0" decay={2} />
      <pointLight position={[20, 8, -20]} intensity={8} distance={50} color="#fff8e1" decay={2} />
      <pointLight position={[-20, 8, -20]} intensity={8} distance={50} color="#fff8e1" decay={2} />
    </group>
  );
}

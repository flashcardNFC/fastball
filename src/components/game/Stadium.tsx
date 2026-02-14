import React, { useRef, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import heroLogo from '../../assets/logo-scratch-hero.png';
import fenceWordmark from '../../assets/bgreen.png';
import { MLB_CONSTANTS } from '../../lib/constants';

// --- Shared Geometries (Hoisted for Performance) ---
const BULB_GEOM = new THREE.PlaneGeometry(0.75, 0.75);
const STRIPE_GEOM = new THREE.PlaneGeometry(150, 5);
const MOUND_GEOM = new THREE.CylinderGeometry(0.8, 2.75, 0.25, 16);
const DIRT_GEOM = new THREE.CircleGeometry(28, 32);
const INFIELD_GEOM = new THREE.CircleGeometry(20, 32);
const PITCHER_BODY_GEOM = new THREE.CapsuleGeometry(0.22, 0.8, 2, 4);
const PITCHER_HEAD_GEOM = new THREE.SphereGeometry(0.18, 8, 8);
const PITCHER_LIMB_GEOM = new THREE.CapsuleGeometry(0.09, 0.8, 2, 4);
const PITCHER_ARM_GEOM = new THREE.CapsuleGeometry(0.07, 0.6, 2, 4);
const BOX_GEOM = new THREE.BoxGeometry(1, 1, 1);
const PLANE_GEOM = new THREE.PlaneGeometry(1, 1);
const FENCE_GEOM = new THREE.BoxGeometry(200, 8, 2);
const RUBBER_GEOM = new THREE.PlaneGeometry(0.6, 0.15);
const FOUL_LINE_GEOM = new THREE.PlaneGeometry(0.2, 180);
const BATTER_BOX_GEOM = new THREE.PlaneGeometry(0.8, 1.2);
const BATTER_BORDER_H_GEOM = new THREE.PlaneGeometry(0.82, 0.05);
const BATTER_BORDER_V_GEOM = new THREE.PlaneGeometry(0.05, 1.25);

// --- Shared Materials ---
const BULB_MAT = new THREE.MeshStandardMaterial({
    color: "#fff",
    emissive: "#ffffff",
    emissiveIntensity: 10,
    toneMapped: false
});
const DARK_MAT = new THREE.MeshStandardMaterial({ color: "#1e441e", roughness: 1 });
const LIGHT_MAT = new THREE.MeshStandardMaterial({ color: "#1a3c1a", roughness: 1 });
const DIRT_MAT = new THREE.MeshStandardMaterial({ color: "#5d4037", roughness: 1 });
const MOUND_MAT = new THREE.MeshStandardMaterial({ color: "#5d4037", roughness: 0.9 });
const PITCHER_MAT = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.5 });
const PITCHER_LIMB_MAT = new THREE.MeshStandardMaterial({ color: "#111" });
const WHITE_MAT = new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.5 });
const FENCE_MAT = new THREE.MeshStandardMaterial({ color: "#17320b" });
const TOWER_MAT = new THREE.MeshStandardMaterial({ color: "#1a1a1a", metalness: 0.9, roughness: 0.1 });
const PANEL_MAT = new THREE.MeshStandardMaterial({ color: "#111", metalness: 0.8, roughness: 0.2 });
const GLOW_MAT = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
const FOUL_MAT = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: false, depthWrite: true });
const BOX_GHOST_MAT = new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: 0.05 });
const BOX_CHALK_MAT = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.3 });

const Pitcher = React.memo(({ machineState, windupStartTime, handedness }: { machineState: string, windupStartTime: number, handedness: 'LEFT' | 'RIGHT' }) => {
    const groupRef = useRef<THREE.Group>(null);
    const legRef = useRef<THREE.Group>(null);
    const armRef = useRef<THREE.Group>(null);

    const isLHP = handedness === 'LEFT';
    const sideMult = isLHP ? -1 : 1;

    useFrame((state) => {
        if (!groupRef.current || !legRef.current || !armRef.current) return;
        const now = performance.now();

        if (machineState === 'windup') {
            const elapsed = (now - windupStartTime) / 1000;
            const progress = Math.min(1, elapsed / 1.2);

            if (progress < 0.5) {
                const step = progress / 0.5;
                legRef.current.rotation.x = -Math.PI / 2 * step;
                legRef.current.position.y = 0.4 + 0.3 * step;
            } else {
                const step = (progress - 0.5) / 0.5;
                legRef.current.rotation.x = -Math.PI / 2 * (1 - step);
                legRef.current.position.y = 0.7 - 0.3 * step;
            }

            armRef.current.rotation.x = -Math.PI * 0.8 * progress;
            armRef.current.rotation.z = (Math.PI / 4 * progress) * sideMult;
        } else if (machineState === 'pitching') {
            legRef.current.rotation.x = 0;
            legRef.current.position.y = 0.4;
            armRef.current.rotation.x = -Math.PI * 0.5;
            armRef.current.rotation.z = -Math.PI / 2 * sideMult;
        } else {
            const t = state.clock.getElapsedTime();
            groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
            legRef.current.rotation.x = 0;
            legRef.current.position.y = 0.4;
            armRef.current.rotation.x = 0;
            armRef.current.rotation.z = 0;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0.15, -MLB_CONSTANTS.DISTANCE_MOUND_TO_PLATE - 0.3]}>
            <mesh position={[0, 1.1, 0]} geometry={PITCHER_BODY_GEOM} material={PITCHER_MAT} />
            <mesh position={[0, 1.8, 0]} geometry={PITCHER_HEAD_GEOM} material={PITCHER_MAT} />
            {/* Landing Leg - stays planted */}
            <mesh position={[0.12 * sideMult, 0.4, 0]} geometry={PITCHER_LIMB_GEOM} material={PITCHER_LIMB_MAT} />
            {/* Lift Leg */}
            <group ref={legRef} position={[-0.12 * sideMult, 0.4, 0]}>
                <mesh position={[0, 0, 0]} geometry={PITCHER_LIMB_GEOM} material={PITCHER_LIMB_MAT} />
            </group>
            {/* Throwing Arm */}
            <group ref={armRef} position={[0.35 * sideMult, 1.5, 0]}>
                <mesh position={[0, -0.3, 0]} geometry={PITCHER_ARM_GEOM} material={PITCHER_LIMB_MAT} />
            </group>
        </group>
    );
});

const LightTower = React.memo(({ position }: { position: [number, number, number] }) => {
    const groupRef = useRef<THREE.Group>(null);

    React.useLayoutEffect(() => {
        if (groupRef.current) {
            groupRef.current.lookAt(0, 1.5, 0);
        }
    }, [position]);

    return (
        <group position={position}>
            <mesh position={[0, 15, 0]} scale={[0.8, 30, 0.8]} geometry={BOX_GEOM} material={TOWER_MAT} />
            <group position={[0, 28, 0]}>
                <group ref={groupRef}>
                    <group position={[0, 0, 1.2]}>
                        <mesh scale={[4, 3, 0.5]} geometry={BOX_GEOM} material={PANEL_MAT} />
                        <Instances geometry={BULB_GEOM} material={BULB_MAT}>
                            {[...Array(12)].map((_, i) => (
                                <Instance
                                    key={i}
                                    position={[(i % 4 - 1.5) * 0.9, (Math.floor(i / 4) - 1) * 0.9, 0.26]}
                                />
                            ))}
                        </Instances>
                        <mesh position={[0, 0, 0.4]} scale={[6, 5, 1]} geometry={PLANE_GEOM} material={GLOW_MAT} />
                        <spotLight
                            position={[0, 0, 1]}
                            angle={Math.PI / 3}
                            penumbra={0.3}
                            intensity={200}
                            distance={150}
                            color="#fff8e1"
                            castShadow={false}
                        />
                    </group>
                </group>
            </group>
        </group>
    );
});

const BearHandsLogo = React.memo(() => {
    const texture = useLoader(THREE.TextureLoader, heroLogo);
    return (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 1.1]}>
            <mesh geometry={PLANE_GEOM}>
                <meshBasicMaterial map={texture} transparent opacity={0.8} />
            </mesh>
        </group>
    );
});

const FenceWordmark = React.memo(() => {
    const texture = useLoader(THREE.TextureLoader, fenceWordmark);
    return (
        <mesh position={[0, 11, -122.5]} geometry={PLANE_GEOM} scale={[72, 24, 1]}>
            <meshBasicMaterial map={texture} />
        </mesh>
    );
});

export const Stadium = React.memo(({ machineState, windupStartTime, pitcherHandedness }: { machineState: string, windupStartTime: number, pitcherHandedness: 'LEFT' | 'RIGHT' }) => {

    // --- Merged Chalk Markings (Optimized Batter's Box) ---
    const batterBoxChalkGeom = React.useMemo(() => {
        const lines: THREE.BufferGeometry[] = [];

        // Batter's Boxes Borders
        [0.7, -0.7].map((side) => {
            [0.6, -0.6].map((z) => {
                const h = BATTER_BORDER_H_GEOM.clone();
                h.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
                h.translate(side, 0.011, z);
                lines.push(h);
            });
            [0.4, -0.4].map((x) => {
                const v = BATTER_BORDER_V_GEOM.clone();
                v.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
                v.translate(side + x, 0.011, 0);
                lines.push(v);
            });
        });

        return BufferGeometryUtils.mergeGeometries(lines);
    }, []);

    return (
        <group>
            {/* Grass Base */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -25]} receiveShadow>
                <planeGeometry args={[150, 250]} />
                <meshStandardMaterial color="#1a3c1a" roughness={1} />
            </mesh>

            <Instances geometry={STRIPE_GEOM} material={DARK_MAT}>
                {[...Array(10)].map((_, i) => (
                    <Instance
                        key={i}
                        position={[0, -0.095, -(i * 2) * 10 - 10]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    />
                ))}
            </Instances>
            <Instances geometry={STRIPE_GEOM} material={LIGHT_MAT}>
                {[...Array(10)].map((_, i) => (
                    <Instance
                        key={i}
                        position={[0, -0.095, -(i * 2 + 1) * 10 - 10]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    />
                ))}
            </Instances>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, -5]} geometry={DIRT_GEOM} material={DIRT_MAT} receiveShadow />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.098, -122]} geometry={PLANE_GEOM} scale={[200, 20, 1]} material={DIRT_MAT} />
            <mesh position={[0, 4, -122]} geometry={FENCE_GEOM} material={FENCE_MAT} />

            <group position={[0, 0, -MLB_CONSTANTS.DISTANCE_MOUND_TO_PLATE]}>
                <mesh position={[0, 0.1, 0]} geometry={MOUND_GEOM} material={DIRT_MAT} receiveShadow />
                <mesh position={[0, 0.226, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={RUBBER_GEOM} material={WHITE_MAT} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={DIRT_MAT}>
                    <circleGeometry args={[3.0, 16]} />
                </mesh>
            </group>

            <Pitcher machineState={machineState} windupStartTime={windupStartTime} handedness={pitcherHandedness} />

            <Suspense fallback={null}>
                <BearHandsLogo />
                <FenceWordmark />
            </Suspense>

            <LightTower position={[60, 0, -80]} />
            <LightTower position={[-60, 0, -80]} />
            <LightTower position={[45, 0, 20]} />
            <LightTower position={[-45, 0, 20]} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.085, -28]} geometry={INFIELD_GEOM} material={LIGHT_MAT} receiveShadow />

            {/* RESTORED HIGH-VISIBILITY FOUL LINES */}
            <group position={[0, 0.012, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]} position={[63.64, 0, -63.64]} geometry={FOUL_LINE_GEOM} material={FOUL_MAT} />
                <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[-63.64, 0, -63.64]} geometry={FOUL_LINE_GEOM} material={FOUL_MAT} />
            </group>

            {/* Render batter box chalk markings */}
            <mesh geometry={batterBoxChalkGeom} material={BOX_CHALK_MAT} />

            {/* Batter's Box Semi-transparent Ghost Areas (Still separate for blending) */}
            <group position={[0, -0.07, 0]}>
                {[0.7, -0.7].map((side) => (
                    <mesh key={side} position={[side, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={BATTER_BOX_GEOM} material={BOX_GHOST_MAT} />
                ))}
            </group>
        </group>
    );
});

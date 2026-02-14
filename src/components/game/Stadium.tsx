import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import heroLogo from '../../assets/logo-scratch-hero.png';
import { MLB_CONSTANTS } from '../../lib/constants';

// Shared geometries and materials for performance
const BULB_GEOM = new THREE.PlaneGeometry(0.75, 0.75);
const BULB_MAT = new THREE.MeshStandardMaterial({
    color: "#fff",
    emissive: "#ffffff",
    emissiveIntensity: 20,
    toneMapped: false
});

const STRIPE_GEOM = new THREE.PlaneGeometry(150, 5);
const DARK_MAT = new THREE.MeshStandardMaterial({ color: "#1e441e", roughness: 1 });
const LIGHT_MAT = new THREE.MeshStandardMaterial({ color: "#1a3c1a", roughness: 1 });


function Pitcher({ machineState, windupStartTime }: { machineState: string, windupStartTime: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const legRef = useRef<THREE.Group>(null);
    const armRef = useRef<THREE.Group>(null);

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
            armRef.current.rotation.z = Math.PI / 4 * progress;
        } else if (machineState === 'pitching') {
            legRef.current.rotation.x = 0;
            legRef.current.position.y = 0.4;
            armRef.current.rotation.x = -Math.PI * 0.5;
            armRef.current.rotation.z = -Math.PI / 2;
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
            {/* Torso */}
            <mesh position={[0, 1.1, 0]}>
                <capsuleGeometry args={[0.22, 0.8, 4, 8]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 1.8, 0]}>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            {/* Plant Leg (Left Leg for a Lefty) */}
            <mesh position={[0.12, 0.4, 0]}>
                <capsuleGeometry args={[0.09, 0.8, 4, 8]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {/* Kick Leg (Right Leg for a Lefty) */}
            <group ref={legRef} position={[-0.12, 0.4, 0]}>
                <mesh position={[0, 0, 0]}>
                    <capsuleGeometry args={[0.09, 0.8, 4, 8]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            </group>
            {/* Throwing Arm (Left Arm) */}
            <group ref={armRef} position={[0.25, 1.5, 0]}>
                <mesh position={[0, -0.3, 0]}>
                    <capsuleGeometry args={[0.07, 0.6, 4, 8]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            </group>
        </group>
    );
}

function LightTower({ position }: { position: [number, number, number] }) {
    const groupRef = useRef<THREE.Group>(null);

    // Precise rotation to face Home Plate (0,0,0)
    // Using useLayoutEffect to ensure it happens before first render
    React.useLayoutEffect(() => {
        if (groupRef.current) {
            groupRef.current.lookAt(0, 1.5, 0);

        }
    }, [position]);

    return (
        <group position={position}>
            {/* Tower Structure */}
            <mesh position={[0, 15, 0]}>
                <boxGeometry args={[0.8, 30, 0.8]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Light Panel */}
            <group position={[0, 28, 0]}>
                <group ref={groupRef}>
                    <group position={[0, 0, 1.2]}>
                        <mesh>
                            <boxGeometry args={[4, 3, 0.5]} />
                            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
                        </mesh>

                        {/* Light Bulbs - Using Instanced Mesh would be better, but for 12 it's okay. 
                            However, let's at least use the shared geometry/material. */}
                        {[...Array(12)].map((_, i) => (
                            <mesh
                                key={i}
                                geometry={BULB_GEOM}
                                material={BULB_MAT}
                                position={[(i % 4 - 1.5) * 0.9, (Math.floor(i / 4) - 1) * 0.9, 0.26]}
                            />
                        ))}


                        {/* Flare overlay */}
                        <mesh position={[0, 0, 0.4]} scale={[6, 5, 1]}>
                            <planeGeometry args={[1, 1]} />
                            <meshBasicMaterial
                                color="#ffffff"
                                transparent
                                opacity={0.2}
                                blending={THREE.AdditiveBlending}
                                depthWrite={false}
                            />
                        </mesh>

                        <spotLight
                            position={[0, 0, 1]}
                            angle={Math.PI / 3}
                            penumbra={0.3}
                            intensity={300}
                            distance={150}
                            color="#fff8e1"
                            castShadow={false}
                        />
                    </group>
                </group>
            </group>
        </group>
    );
}



function BearHandsLogo() {
    const texture = useLoader(THREE.TextureLoader, heroLogo);

    return (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.0]}>
            <mesh>
                <planeGeometry args={[1.75, 1.75]} />
                <meshBasicMaterial map={texture} transparent opacity={0.6} />

            </mesh>
        </group>
    );

}

export function Stadium({ machineState, windupStartTime }: { machineState: string, windupStartTime: number }) {
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -20]} receiveShadow>
                <planeGeometry args={[150, 200]} />
                <meshStandardMaterial color="#1a3c1a" roughness={1} />
            </mesh>

            {/* Grass Stripes - Manual Instancing for clarity but optimized with shared geoms/mats */}
            {[...Array(20)].map((_, i) => (
                <mesh
                    key={i}
                    geometry={STRIPE_GEOM}
                    material={i % 2 === 0 ? DARK_MAT : LIGHT_MAT}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, -0.095, -i * 10 - 10]}
                />
            ))}


            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, -5]} receiveShadow>
                <circleGeometry args={[28, 64]} />
                <meshStandardMaterial color="#5d4037" roughness={1} />
            </mesh>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.098, -100]}>
                <planeGeometry args={[200, 20]} />
                <meshStandardMaterial color="#8d6e63" roughness={1} />
            </mesh>

            <mesh position={[0, 4, -110]}>
                <boxGeometry args={[200, 8, 2]} />
                <meshStandardMaterial color="#0b2e0b" />
            </mesh>

            <group position={[0, 0, -MLB_CONSTANTS.DISTANCE_MOUND_TO_PLATE]}>
                <mesh position={[0, 0.1, 0]} receiveShadow>
                    <cylinderGeometry args={[0.8, 2.75, 0.25, 64]} />
                    <meshStandardMaterial color="#5d4037" roughness={0.9} />
                </mesh>

                <mesh position={[0, 0.226, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.6, 0.15]} />
                    <meshStandardMaterial color="#fff" roughness={0.5} />
                </mesh>

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <circleGeometry args={[3.0, 64]} />
                    <meshStandardMaterial color="#5d4037" roughness={1} depthWrite={false} />
                </mesh>
            </group>

            <Pitcher machineState={machineState} windupStartTime={windupStartTime} />
            <React.Suspense fallback={null}>
                <BearHandsLogo />
            </React.Suspense>

            <LightTower position={[60, 0, -80]} />
            <LightTower position={[-60, 0, -80]} />
            <LightTower position={[45, 0, 20]} />
            <LightTower position={[-45, 0, 20]} />

            {/* Infield Grass Island */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.085, -28]} receiveShadow>
                <circleGeometry args={[20, 64]} />
                <meshStandardMaterial color="#1a3c1a" roughness={1} />
            </mesh>

            {/* Foul Lines */}
            <group position={[0, 0.01, 0]}>
                {/* 1st Base Line (Starts at outer top corner of right box: 1.1, -0.6) */}
                <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]} position={[36.45, -0.08, -35.95]}>
                    <planeGeometry args={[0.12, 100]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
                </mesh>
                {/* 3rd Base Line (Starts at outer top corner of left box: -1.1, -0.6) */}
                <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[-36.45, -0.08, -35.95]}>
                    <planeGeometry args={[0.12, 100]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
                </mesh>
            </group>

            {/* Batter's Boxes with Weathered Chalk */}
            <group position={[0, -0.07, 0]}>
                {[0.7, -0.7].map((side) => (
                    <group key={side} position={[side, 0, 0]}>
                        {/* Worn Center Area */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.8, 1.2]} />
                            <meshBasicMaterial color="#fff" transparent opacity={0.05} />
                        </mesh>

                        {/* Chalk Outlines (Weathered/Incomplete) */}
                        <group position={[0, 0.001, 0]}>
                            {/* Top/Bottom Lines */}
                            {[0.6, -0.6].map((z) => (
                                <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z]}>
                                    <planeGeometry args={[0.82, 0.05]} />
                                    <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
                                </mesh>
                            ))}
                            {/* Side Lines */}
                            {[0.4, -0.4].map((x) => (
                                <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, 0]}>
                                    <planeGeometry args={[0.05, 1.25]} />
                                    <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
                                </mesh>
                            ))}

                        </group>
                    </group>
                ))}
            </group>
        </group>
    );
}

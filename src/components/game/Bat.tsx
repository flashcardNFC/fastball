import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BatProps {
    swingTime: number | null;
    handedness: 'LEFT' | 'RIGHT';
    pciPosition: { x: number; y: number };
}

export function Bat({ swingTime, handedness, pciPosition }: BatProps) {
    const pivotRef = useRef<THREE.Group>(null);
    const animationStart = useRef<number | null>(null);
    const isLefty = handedness === 'LEFT';
    const sideMult = isLefty ? 1 : -1;

    useEffect(() => {
        if (swingTime) animationStart.current = performance.now();
    }, [swingTime]);

    useFrame(() => {
        if (!pivotRef.current) return;

        // Base hand position adjusted for PCI "reach"
        // Move hands EVEN CLOSER to the plate (was 0.85)
        const baseX = 0.65 * sideMult;
        const reachedX = baseX + (pciPosition.x * 0.45);
        const reachedY = 1.05 + (pciPosition.y - 1.1) * 0.5;
        const reachedZ = 0.9;

        if (animationStart.current) {
            const elapsed = (performance.now() - animationStart.current) / 1000;
            const duration = 0.5; // Full duration for wrap

            if (elapsed < duration) {
                const progress = elapsed / duration;
                const contactThreshold = 0.25;

                // Rotation Y: The actual swing (around the batter)
                const startY = isLefty ? -Math.PI / 2.2 : Math.PI / 2.2;
                const contactY = isLefty ? Math.PI / 4 : -Math.PI / 4;
                const finishY = isLefty ? Math.PI * 1.3 : -Math.PI * 1.3;

                if (progress < contactThreshold) {
                    const p = progress / contactThreshold;
                    pivotRef.current.rotation.y = startY + p * (contactY - startY);
                } else {
                    const p = (progress - contactThreshold) / (1 - contactThreshold);
                    const ease = 1 - Math.pow(1 - p, 3);
                    pivotRef.current.rotation.y = contactY + ease * (finishY - contactY);
                }

                // Rotation X: Vertical Tilt (Up -> Level -> Follow through)
                const startX = Math.PI / 2.3; // VERY UPRIGHT (~80 DEGREE ANGLE UP)
                const contactX = 0;
                const finishX = -Math.PI / 6;

                if (progress < contactThreshold) {
                    const p = progress / contactThreshold;
                    pivotRef.current.rotation.x = startX + p * (contactX - startX);
                } else {
                    const p = (progress - contactThreshold) / (1 - contactThreshold);
                    const ease = 1 - Math.pow(1 - p, 2);
                    pivotRef.current.rotation.x = contactX + ease * (finishX - contactX);
                }

                // Rotation Z: Aggressive lean toward user/camera for 3D depth
                const startZ = (Math.PI / 3) * sideMult; // Tilted heavily toward user
                pivotRef.current.rotation.z = startZ * (1 - progress);

                // Hand Reach Dynamics
                const pushProgress = Math.sin(progress * Math.PI);
                pivotRef.current.position.x = reachedX - (pushProgress * 0.1 * sideMult);
                pivotRef.current.position.y = reachedY;
                pivotRef.current.position.z = reachedZ - (pushProgress * 0.15);
            } else {
                animationStart.current = null;
            }
        } else {
            // Idle "Set" Stance
            // Crowding plate, barrel ALMOST VERTICAL and TILTED HEAVILY TOWARD CAMERA
            pivotRef.current.rotation.y = isLefty ? -Math.PI / 2.2 : Math.PI / 2.2;
            pivotRef.current.rotation.x = Math.PI / 2.3; // ~80 degrees Up
            pivotRef.current.rotation.z = (Math.PI / 3) * sideMult; // Heavy 3D Lean toward user
            pivotRef.current.position.set(reachedX, reachedY, reachedZ + 0.1);
        }
    });

    return (
        <group ref={pivotRef}>
            {/* Bat Geometry centered at knob (0,0,0) and pointing along negative Z */}
            <group rotation={[-Math.PI / 2, 0, 0]}>
                {/* Barrel */}
                <mesh position={[0, 0.7, 0]}>
                    <cylinderGeometry args={[0.045, 0.02, 0.8, 32]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} metalness={0.1} />
                </mesh>
                {/* Tip */}
                <mesh position={[0, 1.1, 0]}>
                    <sphereGeometry args={[0.045, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} />
                </mesh>
                {/* Handle */}
                <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.02, 0.015, 0.4, 16]} />
                    <meshStandardMaterial color="#222" roughness={0.9} />
                </mesh>
                {/* Knob */}
                <mesh position={[0, -0.05, 0]}>
                    <cylinderGeometry args={[0.028, 0.02, 0.04, 16]} />
                    <meshStandardMaterial color="#c4a484" />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                    <sphereGeometry args={[0.028, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                    <meshStandardMaterial color="#c4a484" />
                </mesh>
            </group>
        </group>
    );
}

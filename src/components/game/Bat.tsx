import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BatProps {
    swingTime: number | null;
    handedness: 'LEFT' | 'RIGHT';
    pciPositionRef: React.MutableRefObject<{ x: number; y: number }>;
}


export function Bat({ swingTime, handedness, pciPositionRef }: BatProps) {

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
        const pos = pciPositionRef.current;
        const baseX = 0.65 * sideMult;
        const reachedX = baseX + (pos.x * 0.45);
        const reachedY = 1.05 + (pos.y - 1.1) * 0.5;
        const reachedZ = 0.9;


        if (animationStart.current) {
            const elapsed = (performance.now() - animationStart.current) / 1000;
            const duration = 0.3; // ELITE MLB swing speed

            if (elapsed < duration) {
                const progress = elapsed / duration;
                // Visual contact happens at ~35% of the swing
                const contactThreshold = 0.35;

                // Rotation Y: The actual swing
                const startY = isLefty ? -Math.PI / 2.2 : Math.PI / 2.2;

                // Rotation X: Vertical Tilt
                const startX = Math.PI / 2.3;
                const contactX = 0;
                const finishX = -Math.PI / 6;

                if (progress < contactThreshold) {
                    const p = progress / contactThreshold;
                    const easeP = p * p; // Acceleration phase
                    pivotRef.current.rotation.y = startY + easeP * (isLefty ? Math.PI / 2 : -Math.PI / 2);
                    pivotRef.current.rotation.x = startX + p * (contactX - startX);
                } else {
                    const p = (progress - contactThreshold) / (1 - contactThreshold);
                    const ease = 1 - Math.pow(1 - p, 5); // Explosive follow through
                    const swingPath = isLefty ? Math.PI / 2 : -Math.PI / 2;
                    pivotRef.current.rotation.y = (startY + swingPath) + ease * (isLefty ? Math.PI : -Math.PI);
                    pivotRef.current.rotation.x = contactX + ease * (finishX - contactX);
                }


                // Rotation Z: Depth lean
                const startZ = (Math.PI / 3) * sideMult;
                pivotRef.current.rotation.z = startZ * (1 - progress);

                // Hand Reach Dynamics - Keep the bat "forward" through the zone
                const pushProgress = Math.sin(Math.min(1, progress / 0.6) * Math.PI);
                pivotRef.current.position.x = reachedX;
                pivotRef.current.position.y = reachedY;
                pivotRef.current.position.z = reachedZ - (pushProgress * 0.2);
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
                {/* Knob - Reshaped for MLB look (Disk with flared transition) */}
                <mesh position={[0, -0.04, 0]}>
                    <cylinderGeometry args={[0.02, 0.015, 0.04, 16]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
                </mesh>
                <mesh position={[0, -0.065, 0]}>
                    <cylinderGeometry args={[0.038, 0.038, 0.015, 32]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.075, 0]}>
                    <sphereGeometry args={[0.038, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} />
                </mesh>

            </group>
        </group>
    );
}

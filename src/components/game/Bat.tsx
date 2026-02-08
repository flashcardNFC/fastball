import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BatProps {
    swingTime: number | null;
}

export function Bat({ swingTime }: BatProps) {
    const pivotRef = useRef<THREE.Group>(null);
    const animationStart = useRef<number | null>(null);

    useEffect(() => {
        if (swingTime) animationStart.current = performance.now();
    }, [swingTime]);

    useFrame(() => {
        if (!pivotRef.current) return;

        if (animationStart.current) {
            const elapsed = (performance.now() - animationStart.current) / 1000;
            const duration = 0.14;

            if (elapsed < duration) {
                const progress = elapsed / duration;
                const startY = -Math.PI / 2.8;
                const endY = Math.PI / 4;
                pivotRef.current.rotation.y = startY + progress * (endY - startY);

                const startX = -Math.PI / 3;
                const contactX = -Math.PI / 12;
                const endX = -Math.PI / 10;

                if (progress < 0.6) {
                    pivotRef.current.rotation.x = startX + (progress / 0.6) * (contactX - startX);
                } else {
                    pivotRef.current.rotation.x = contactX + ((progress - 0.6) / 0.4) * (endX - contactX);
                }

                pivotRef.current.rotation.z = Math.PI / 12 * (1 - progress);
                pivotRef.current.position.x = 1.2 - progress * 0.3;
                pivotRef.current.position.y = 1.2 - progress * 0.1;
                pivotRef.current.position.z = 1.5 - progress * 0.4;
            } else if (elapsed < 0.5) {
                pivotRef.current.rotation.y = Math.PI / 4;
                pivotRef.current.rotation.x = -Math.PI / 10;
                pivotRef.current.rotation.z = 0;
            } else {
                animationStart.current = null;
            }
        } else {
            pivotRef.current.rotation.y = -Math.PI / 2.8;
            pivotRef.current.rotation.x = -Math.PI / 2.6;
            pivotRef.current.rotation.z = Math.PI / 12;
            pivotRef.current.position.set(1.2, 1.2, 1.5);
        }
    });

    return (
        <group ref={pivotRef}>
            <group rotation={[Math.PI / 2, 0, 0]}>
                <mesh position={[0, 0.75, 0]}>
                    <cylinderGeometry args={[0.045, 0.02, 0.9, 32]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} metalness={0.1} />
                </mesh>
                <mesh position={[0, 1.2, 0]}>
                    <sphereGeometry args={[0.045, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} metalness={0.1} />
                </mesh>
                <mesh position={[0, 1.19, 0]}>
                    <sphereGeometry args={[0.03, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#8b7355" roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.1, 0]}>
                    <cylinderGeometry args={[0.02, 0.015, 0.7, 16]} />
                    <meshStandardMaterial color="#222" roughness={0.9} />
                </mesh>
                <mesh position={[0, -0.48, 0]}>
                    <cylinderGeometry args={[0.028, 0.02, 0.04, 16]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} metalness={0.1} />
                </mesh>
                <mesh position={[0, -0.5, 0]}>
                    <sphereGeometry args={[0.028, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                    <meshStandardMaterial color="#c4a484" roughness={0.3} metalness={0.1} />
                </mesh>
            </group>
        </group>
    );
}

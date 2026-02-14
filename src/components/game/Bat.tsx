import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface BatProps {
    swingTime: number | null;
    handedness: 'LEFT' | 'RIGHT';
    pciPositionRef: React.MutableRefObject<{ x: number; y: number }>;
}

// --- Materials ---
const WOOD_MAT = new THREE.MeshStandardMaterial({ color: "#c4a484", roughness: 0.3, metalness: 0.1 });
const TAPE_MAT = new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.8, metalness: 0 });

export function Bat({ swingTime, handedness, pciPositionRef }: BatProps) {
    const pivotRef = useRef<THREE.Group>(null);
    const animationStart = useRef<number | null>(null);
    const isLefty = handedness === 'LEFT';
    const sideMult = isLefty ? 1 : -1;

    // --- Performance Geometry (2 parts = 2 draw calls) ---
    const { woodGeom, tapeGeom } = useMemo(() => {
        // Wood Parts
        const barrel = new THREE.CylinderGeometry(0.045, 0.02, 0.68, 16);
        barrel.translate(0, 0.56, 0);

        const tip = new THREE.SphereGeometry(0.045, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        tip.translate(0, 0.9, 0);

        const knobDisc = new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16);
        knobDisc.translate(0, -0.20, 0);

        // Tape Parts
        const handle = new THREE.CylinderGeometry(0.02, 0.015, 0.38, 12);
        handle.translate(0, 0.04, 0);

        const knobBase = new THREE.CylinderGeometry(0.02, 0.015, 0.04, 12);
        knobBase.translate(0, -0.17, 0);

        return {
            woodGeom: BufferGeometryUtils.mergeGeometries([barrel, tip, knobDisc]),
            tapeGeom: BufferGeometryUtils.mergeGeometries([handle, knobBase])
        };
    }, []);

    useEffect(() => {
        if (swingTime) {
            animationStart.current = performance.now();
        }
    }, [swingTime]);

    useFrame(() => {
        if (!pivotRef.current) return;

        const pos = pciPositionRef.current;
        const baseX = 0.65 * sideMult;
        const reachedX = baseX + (pos.x * 0.45);
        const reachedY = 1.05 + (pos.y - 1.1) * 0.5;
        const reachedZ = 0.65;

        if (animationStart.current) {
            const elapsed = (performance.now() - animationStart.current) / 1000;
            const duration = 0.45;
            const contactThreshold = 0.25;

            if (elapsed < duration) {
                const progress = elapsed / duration;
                const startX = -1.2;
                const contactX = -0.1;
                const finishX = -1.0;

                const startY = isLefty ? -2.4 : 2.4;
                const contactY = isLefty ? -Math.PI : Math.PI;
                const finishY = isLefty ? -7.2 : 7.2;

                if (progress < contactThreshold) {
                    const p = progress / contactThreshold;
                    const easeP = Math.pow(p, 1.4);
                    pivotRef.current.rotation.y = startY + easeP * (contactY - startY);
                    pivotRef.current.rotation.x = startX + easeP * (contactX - startX);
                } else {
                    const p = (progress - contactThreshold) / (1 - contactThreshold);
                    const ease = 1 - Math.pow(1 - p, 2.5);
                    pivotRef.current.rotation.y = contactY + ease * (finishY - contactY);
                    pivotRef.current.rotation.x = contactX + ease * (finishX - contactX);
                }

                const startZ = (Math.PI / 4) * sideMult;
                pivotRef.current.rotation.z = startZ * (1 - Math.min(1, progress * 1.5));

                const pushProgress = Math.sin(Math.min(1, progress / 0.5) * Math.PI);
                pivotRef.current.position.x = reachedX;
                pivotRef.current.position.y = reachedY;
                pivotRef.current.position.z = reachedZ - (pushProgress * 0.4);
            } else {
                animationStart.current = null;
            }
        } else {
            pivotRef.current.rotation.y = isLefty ? -2.4 : 2.4;
            pivotRef.current.rotation.x = -1.2;
            pivotRef.current.rotation.z = (Math.PI / 4) * sideMult;
            pivotRef.current.position.set(reachedX, reachedY, reachedZ + 0.1);
        }
    });

    return (
        <group ref={pivotRef}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
                <mesh geometry={woodGeom} material={WOOD_MAT} castShadow />
                <mesh geometry={tapeGeom} material={TAPE_MAT} castShadow />
            </group>
        </group>
    );
}

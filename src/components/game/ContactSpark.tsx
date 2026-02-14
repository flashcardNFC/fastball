import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ContactSparkProps {
    position: [number, number, number];
    active: boolean;
}

// Lightweight contact flash — single sprite, no particles, no pointLight
export function ContactSpark({ position, active }: ContactSparkProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const startTime = useRef<number>(0);
    const wasActive = useRef(false);

    useFrame(() => {
        if (!meshRef.current) return;

        if (active && !wasActive.current) {
            startTime.current = performance.now();
            wasActive.current = true;
        }
        if (!active) {
            wasActive.current = false;
            meshRef.current.visible = false;
            return;
        }

        const elapsed = (performance.now() - startTime.current) / 1000;
        if (elapsed > 0.25) {
            meshRef.current.visible = false;
            return;
        }

        meshRef.current.visible = true;
        const scale = 1 + elapsed * 4;
        const opacity = 1 - elapsed / 0.25;
        meshRef.current.scale.setScalar(scale);
        (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    });

    return (
        <mesh ref={meshRef} position={position} visible={false}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshBasicMaterial color="#ffcc00" transparent opacity={0} />
        </mesh>
    );
}

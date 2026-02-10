import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PCIProps {
    position: { x: number; y: number };
}

export function PCI({ position }: PCIProps) {
    const meshRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!meshRef.current) return;
        // Smoothly follow the position
        meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, position.x, 0.2);
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, position.y, 0.2);
    });

    return (
        <group ref={meshRef} position={[0, 1.1, 0.5]}>
            {/* Outer Circle */}
            <mesh>
                <ringGeometry args={[0.12, 0.13, 32]} />
                <meshBasicMaterial color="#fff" transparent opacity={0.3} />
            </mesh>
            {/* Inner Circle */}
            <mesh>
                <ringGeometry args={[0.04, 0.05, 32]} />
                <meshBasicMaterial color="#fff" transparent opacity={0.5} />
            </mesh>
            {/* Center Dot */}
            <mesh>
                <circleGeometry args={[0.005, 16]} />
                <meshBasicMaterial color="#fff" transparent opacity={0.8} />
            </mesh>
        </group>
    );
}

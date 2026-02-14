import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TeamStats } from '../../types/game';

interface PCIProps {
    pciPositionRef: React.MutableRefObject<{ x: number; y: number }>;
    teamStats: TeamStats;
}

// Hoisted Geometries (Dotted look uses more segments)
const OUTER_RING_GEOM = new THREE.RingGeometry(0.18, 0.18, 64);
const INNER_RING_GEOM = new THREE.RingGeometry(0.08, 0.08, 64);
const CENTER_DOT_GEOM = new THREE.CircleGeometry(0.005, 16);

// Shared Dotted Materials
const RING_MAT = new THREE.PointsMaterial({ color: "#fff", size: 0.005, sizeAttenuation: true, transparent: true, opacity: 0.15 });

export function PCI({ pciPositionRef, teamStats }: PCIProps) {
    const meshRef = useRef<THREE.Group>(null);

    const visualScale = 1 + (teamStats.contact * 0.02);

    useFrame(() => {
        if (!meshRef.current) return;
        const pos = pciPositionRef.current;
        meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, pos.x, 0.4);
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, pos.y, 0.4);
    });

    return (
        <group ref={meshRef} position={[0, 1.1, 0.5]} scale={[visualScale, visualScale, 1]}>
            <points geometry={OUTER_RING_GEOM}>
                <pointsMaterial color="#fff" size={0.003} sizeAttenuation={true} transparent opacity={0.1} />
            </points>
            <points geometry={INNER_RING_GEOM}>
                <pointsMaterial color="#fff" size={0.003} sizeAttenuation={true} transparent opacity={0.15} />
            </points>
            <mesh geometry={CENTER_DOT_GEOM}>
                <meshBasicMaterial color="#fff" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}

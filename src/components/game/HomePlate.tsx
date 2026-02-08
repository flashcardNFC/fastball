import React, { useMemo } from 'react';
import * as THREE from 'three';

export function HomePlate() {
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        const w = 0.22;
        const h = 0.43;
        s.moveTo(-w, 0);
        s.lineTo(w, 0);
        s.lineTo(w, -w);
        s.lineTo(0, -h);
        s.lineTo(-w, -w);
        s.closePath();
        return s;
    }, []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1.0} />
        </mesh>
    );
}

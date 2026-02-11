import { useMemo } from 'react';
import * as THREE from 'three';

export function StrikeZone() {
    const edges = useMemo(() => {
        const geo = new THREE.PlaneGeometry(0.7, 1.0);
        return new THREE.EdgesGeometry(geo);
    }, []);

    return (
        <group position={[0, 1.1, 0]}>
            <lineSegments geometry={edges}>
                <lineBasicMaterial color="white" transparent opacity={0.1} />
            </lineSegments>
        </group>
    );
}

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MLB_CONSTANTS } from '../../lib/constants';

export const Camera = ({ isUserPitching }: { isUserPitching: boolean }) => {
    useFrame((state) => {
        const targetPos = isUserPitching
            ? new THREE.Vector3(0, 2.2, -MLB_CONSTANTS.DISTANCE_MOUND_TO_PLATE + 3)
            : new THREE.Vector3(0, 1.4, 3.2);

        const targetLookAt = isUserPitching
            ? new THREE.Vector3(0, 1.0, 5)
            : new THREE.Vector3(0, 1.2, -5);

        state.camera.position.lerp(targetPos, 0.05);
        state.camera.lookAt(targetLookAt);
    });
    return null;
};

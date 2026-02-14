import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MLB_CONSTANTS } from '../../lib/constants';
import type { PitchResult } from '../../types/game';

export const Camera = ({ isUserPitching, machineState, ballRef, pitchResult }: {
    isUserPitching: boolean,
    machineState: string,
    ballRef: React.MutableRefObject<THREE.Mesh | null>,
    pitchResult: PitchResult | null
}) => {
    const ballLastPos = useRef(new THREE.Vector3(0, 1.2, -5));
    const wasInFlight = useRef(false);

    useFrame((state) => {
        let targetPos: THREE.Vector3;
        let targetLookAt: THREE.Vector3;

        const isHomeRun = pitchResult?.type === 'HOMERUN';

        if (machineState === 'flight' && ballRef.current && isHomeRun) {
            wasInFlight.current = true;
            const ballPos = ballRef.current.position;
            // Dynamic follow: stay behind/above the plate but look at the ball
            const heightFactor = Math.max(0, ballPos.y - 2) * 0.3;
            targetPos = new THREE.Vector3(ballPos.x * 0.2, 1.8 + heightFactor, 4.5 + heightFactor);
            targetLookAt = ballPos.clone();
            ballLastPos.current.copy(ballPos);
        } else if (machineState === 'result' && wasInFlight.current && isHomeRun) {
            // Linger on where the ball settled ONLY if it was previously in flight (Home Run)
            targetPos = new THREE.Vector3(0, 1.4, 3.2);
            targetLookAt = ballLastPos.current;
        } else {
            // Standard static views for takes, misses, non-HR hits, and preparation
            wasInFlight.current = false;
            targetPos = isUserPitching
                ? new THREE.Vector3(0, 2.2, -MLB_CONSTANTS.DISTANCE_MOUND_TO_PLATE + 3)
                : new THREE.Vector3(0, 1.4, 3.2);

            targetLookAt = isUserPitching
                ? new THREE.Vector3(0, 1.0, 5)
                : new THREE.Vector3(0, 1.2, -5);
        }

        state.camera.position.lerp(targetPos, 0.08);
        state.camera.lookAt(targetLookAt);
    });
    return null;
};

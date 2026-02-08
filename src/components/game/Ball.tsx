import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';
import { MLB_CONSTANTS } from '../../lib/constants';
import { Pitch, PitchResult, Difficulty, TeamStats, BALL_START_POS } from '../../types/game';

interface BallProps {
    state: 'idle' | 'windup' | 'pitching' | 'flight' | 'result';
    onFinish: (result: PitchResult) => void;
    pitchStartTime: number;
    pitch: Pitch;
    swingRef: React.MutableRefObject<number | null>;
    targetLocation: { x: number; y: number };
    difficulty: Difficulty;
    teamStats: TeamStats;
    strikes: number;
}

export function Ball({
    state,
    onFinish,
    pitchStartTime,
    pitch,
    swingRef,
    targetLocation,
    difficulty,
    teamStats,
    strikes
}: BallProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const flightData = useRef<{ v0: THREE.Vector3; startTime: number } | null>(null);
    const [localHasProcessed, setLocalHasProcessed] = useState(false);
    const [showTrail, setShowTrail] = useState(false);
    const hasFinishedRef = useRef(false);

    useEffect(() => {
        if (state === 'pitching') {
            setLocalHasProcessed(false);
            hasFinishedRef.current = false;
            flightData.current = null;
            setShowTrail(false);
        } else if (state === 'idle' || state === 'windup') {
            setShowTrail(false);
        }
    }, [state]);

    useFrame(() => {
        if (!meshRef.current) return;

        if (state === 'pitching' && !localHasProcessed) {
            const elapsed = (performance.now() - pitchStartTime) / 1000;
            if (elapsed < 0) {
                meshRef.current.position.copy(BALL_START_POS);
                return;
            }

            if (!showTrail) setShowTrail(true);

            const velocity = pitch.speed * MLB_CONSTANTS.MPH_TO_MS;
            const totalTime = Math.abs(BALL_START_POS.z) / velocity;
            const progress = Math.min(elapsed / totalTime, 1.2);

            const currentZ = BALL_START_POS.z + (velocity * elapsed);
            const breakFactor = Math.pow(progress, 2);
            const currentX = THREE.MathUtils.lerp(BALL_START_POS.x, targetLocation.x + (pitch.movement.x * breakFactor), Math.min(progress, 1));

            const T = totalTime;
            const vy0 = (targetLocation.y + (pitch.movement.y * 1) - BALL_START_POS.y - 0.5 * MLB_CONSTANTS.GRAVITY * T * T) / T;
            const currentY = BALL_START_POS.y + (vy0 * elapsed) + (0.5 * MLB_CONSTANTS.GRAVITY * elapsed * elapsed);

            meshRef.current.position.set(currentX, currentY, currentZ);

            const CONTACT_WINDOW_Z = 0.8;
            if (swingRef.current !== null && Math.abs(currentZ) < CONTACT_WINDOW_Z && !localHasProcessed) {
                const absolutePlateTime = pitchStartTime + totalTime * 1000;
                const timingDiff = swingRef.current - absolutePlateTime;

                setLocalHasProcessed(true);

                const absTiming = Math.abs(timingDiff);
                const roll = Math.random();
                let res: PitchResult;

                const factor = difficulty === 'MLB' ? 0.75 : difficulty === 'ROOKIE' ? 1.5 : 1.0;
                const powerMod = teamStats.power * 0.15;
                const contactMod = teamStats.contact * 0.15;
                const speedMod = teamStats.speed * 0.08;

                const hrWindow = 18 * factor * (1 + powerMod - contactMod);
                const perfectWindow = 12 * factor;
                const singleWindow = 65 * factor * (1 + contactMod - powerMod * 0.5);

                const isOutside = Math.abs(targetLocation.x) > 0.35 || targetLocation.y < 0.6 || targetLocation.y > 1.6;
                const zonePenalty = isOutside ? 0.35 : 1.0;

                const timingLabel = absTiming < perfectWindow ? 'PERFECT' : Math.abs(Math.round(timingDiff)) + 'MS ' + (timingDiff > 0 ? 'LATE' : 'EARLY');

                if (absTiming < hrWindow) {
                    const hrChance = (0.5 + speedMod) * zonePenalty;
                    if (roll < hrChance) {
                        const qualityFactor = 1 - (absTiming / hrWindow);
                        const ev = (110 + (qualityFactor * 12) + (powerMod * 12)) + (Math.random() * 5);
                        const dist = 390 + (ev - 100) * 5 + (qualityFactor * 25);
                        res = { status: 'hit', type: 'HOMERUN', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: 26 + (Math.random() * 4), distance: dist, pitchLocation: targetLocation, pitchType: pitch.type };
                    } else {
                        res = { status: 'hit', type: 'DOUBLE', timingOffset: timingDiff, timingLabel, exitVelocity: 108, launchAngle: 15 + (Math.random() * 6), pitchLocation: targetLocation, pitchType: pitch.type };
                    }
                } else if (absTiming < 40 * factor) {
                    const tripleChance = 0.35 + speedMod;
                    if (roll < tripleChance) res = { status: 'hit', type: 'TRIPLE', timingOffset: timingDiff, timingLabel, exitVelocity: 104, launchAngle: 18 + (Math.random() * 4), pitchLocation: targetLocation, pitchType: pitch.type };
                    else res = { status: 'hit', type: 'SINGLE', timingOffset: timingDiff, timingLabel, exitVelocity: 98, launchAngle: 10 + (Math.random() * 4), pitchLocation: targetLocation, pitchType: pitch.type };
                } else if (absTiming < singleWindow) {
                    const hitChance = (0.45 + (contactMod * 0.5)) * (isOutside ? 0.5 : 1.0);
                    const outChance = powerMod * 0.3;
                    if (roll < hitChance - outChance) res = { status: 'hit', type: 'SINGLE', timingOffset: timingDiff, timingLabel, exitVelocity: 92, launchAngle: 5 + (Math.random() * 5), pitchLocation: targetLocation, pitchType: pitch.type };
                    else res = { status: 'miss', type: 'OUT', timingOffset: timingDiff, timingLabel, exitVelocity: 94, launchAngle: 10 + (Math.random() * 10), pitchLocation: targetLocation, pitchType: pitch.type };
                } else if (absTiming < (strikes >= 2 ? 95 : 115) * factor) {
                    res = { status: 'foul', type: 'FOUL', timingOffset: timingDiff, timingLabel, pitchLocation: targetLocation, pitchType: pitch.type };
                } else {
                    res = { status: 'miss', type: 'STRIKE', timingOffset: timingDiff, timingLabel, pitchLocation: targetLocation, pitchType: pitch.type };
                }

                if (res.status === 'hit' || res.type === 'OUT') initFlight(res);
                complete(res);
            }

            if (currentZ > 1.3) {
                const isStrike = Math.abs(targetLocation.x) <= 0.35 && targetLocation.y >= 0.6 && targetLocation.y <= 1.6;
                complete({ status: isStrike ? 'strike' : 'ball', type: isStrike ? 'STRIKE' : 'BALL', pitchLocation: targetLocation });
            }
        } else if (state === 'flight' && flightData.current) {
            const elapsed = (performance.now() - flightData.current.startTime) / 1000;
            meshRef.current.position.x += flightData.current.v0.x * 0.016;
            meshRef.current.position.z += flightData.current.v0.z * 0.016;
            meshRef.current.position.y += (flightData.current.v0.y + MLB_CONSTANTS.GRAVITY * elapsed) * 0.016;
            if (elapsed > 5) flightData.current = null;
        }
    });

    const complete = (res: PitchResult) => {
        if (hasFinishedRef.current) return;
        hasFinishedRef.current = true;
        setLocalHasProcessed(true);
        onFinish(res);
    };

    const initFlight = (res: PitchResult) => {
        const speedMs = (res.exitVelocity! * MLB_CONSTANTS.MPH_TO_MS);
        const angleRad = (res.launchAngle! * Math.PI) / 180;
        const timing = res.timingOffset || 0;
        const sprayAngle = (timing / 150) * (Math.PI / 3.5);
        flightData.current = {
            startTime: performance.now(),
            v0: new THREE.Vector3(
                Math.sin(sprayAngle) * speedMs * Math.cos(angleRad),
                speedMs * Math.sin(angleRad),
                -Math.cos(sprayAngle) * speedMs * Math.cos(angleRad)
            )
        };
    };

    if (state === 'idle' || state === 'windup') return null;

    const ballMesh = (
        <mesh ref={meshRef}>
            <sphereGeometry args={[MLB_CONSTANTS.BALL_RADIUS * 1.5, 32, 32]} />
            <meshStandardMaterial color="#fff" emissive={pitch.color} emissiveIntensity={2} />
        </mesh>
    );

    return (
        <group>
            {showTrail ? (
                <Trail width={1.8} length={10} color={new THREE.Color(pitch.color)} attenuation={(t) => t * t}>
                    {ballMesh}
                </Trail>
            ) : ballMesh}
        </group>
    );
}

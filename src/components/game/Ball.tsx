import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';
import { MLB_CONSTANTS } from '../../lib/constants';
import type { Pitch, PitchResult, Difficulty, TeamStats } from '../../types/game';
import { BALL_START_POS } from '../../types/game';

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
    pciPositionRef: React.MutableRefObject<{ x: number; y: number }>;
    onContact?: (pos: [number, number, number], isHit: boolean) => void;
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
    strikes,
    pciPositionRef,
    onContact
}: BallProps) {

    const meshRef = useRef<THREE.Mesh>(null);
    const flightData = useRef<{ v0: THREE.Vector3; startTime: number } | null>(null);
    const [localHasProcessed, setLocalHasProcessed] = useState(false);
    const [showTrail, setShowTrail] = useState(false);
    const hasFinishedRef = useRef(false);

    // Performance: Pre-calculate color object so we don't 'new' it every frame/render
    const ballColor = React.useMemo(() => new THREE.Color(pitch.color), [pitch.color]);



    useEffect(() => {
        // Reset sequence logic: Only clear everything when starting a NEW pitch (windup/idle)
        // Transitioning to 'flight' or 'result' should NOT kill the trail or reset flags
        if (state === 'idle' || state === 'windup') {
            setShowTrail(false);
            setLocalHasProcessed(false);
            hasFinishedRef.current = false;
            flightData.current = null;
        }
    }, [state, pitch]); // Include pitch to reset trail on new selections




    useFrame(() => {
        if (!meshRef.current) return;

        if (state === 'pitching' && !localHasProcessed) {
            const elapsed = (performance.now() - pitchStartTime) / 1000;

            // Initial positioning before pitch release
            if (elapsed < 0) {
                meshRef.current.position.copy(BALL_START_POS);
                if (showTrail) setShowTrail(false);
                return;
            }

            // Delay trail slightly until ball is clear of pitcher's starting pos to avoid "jump" lines
            if (elapsed > 0.05 && !showTrail) setShowTrail(true);

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

            const CONTACT_WINDOW_Z = 0.5; // Tighter window for faster swing
            if (swingRef.current !== null && Math.abs(currentZ) < CONTACT_WINDOW_Z && !localHasProcessed) {
                // The bat takes ~105ms to reach the plate in the optimized animation.
                const SWING_DELAY = 105;
                const absolutePlateTime = pitchStartTime + totalTime * 1000;
                const timingDiff = (swingRef.current + SWING_DELAY) - absolutePlateTime;

                setLocalHasProcessed(true);

                // Visual collision 'snap' to the Impact Plane (Z ~ 0.25)
                // This ensures the ball is VISIBLY touching the barrel at the moment of impact.
                meshRef.current.position.z = 0.25;

                const absTiming = Math.abs(timingDiff);
                const roll = Math.random();
                let res: PitchResult;

                const factor = difficulty === 'MLB' ? 0.75 : difficulty === 'ROOKIE' ? 1.5 : 1.0;
                const powerMod = teamStats.power * 0.15;
                const contactMod = teamStats.contact * 0.15;

                const perfectWindow = 12 * factor;
                const timingLabel = absTiming < perfectWindow ? 'PERFECT' : Math.abs(Math.round(timingDiff)) + 'MS ' + (timingDiff > 0 ? 'LATE' : 'EARLY');



                // 1. Calculate PCI Accuracy (Plate Coverage)
                const currentPci = pciPositionRef.current;
                const pciDist = Math.sqrt(
                    Math.pow(currentPci.x - targetLocation.x, 2) +
                    Math.pow(currentPci.y - targetLocation.y, 2)
                );
                const pciPenalty = Math.max(0, 1 - (pciDist / 0.4)); // Coverage circle of ~0.4 units


                // 2. Normal Distribution Exit Velocity (EV)
                // Formula centers on a max EV, penalizes for timing and PCI gap
                const timingPenalty = Math.max(0, 1 - (absTiming / (150 * factor)));
                const peakEV = 105 + (powerMod * 10);
                const minEV = 65;

                // Base Quality of Hit (0 to 1)
                const contactQuality = timingPenalty * 0.6 + pciPenalty * 0.4;

                // Calculate EV with a normal-ish distribution (Standard Deviation logic)
                const stdDev = 5;
                const u1 = Math.random();
                const u2 = Math.random();
                const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

                const baseEV = minEV + (peakEV - minEV) * contactQuality;
                const ev = Math.max(minEV, baseEV + (z0 * stdDev));

                // 3. Launch Angle (LA)
                // LA is slightly random but influenced by PCI vertical position (Under ball = Fly, Over ball = Ground)
                const verticalOffset = (currentPci.y - targetLocation.y);
                const baseLA = 15 + (verticalOffset * 60); // PCI under ball increases LA

                const la = Math.max(-15, Math.min(50, baseLA + (Math.random() * 10 - 5)));

                // 4. Outcomes determined by LA and EV
                const sideMult = (teamStats.handedness === 'RIGHT') ? 1 : -1;
                // PI/3.5 is ~51 degrees. Foul lines in Stadium.tsx are PI/4 (45 degrees).
                const sprayAngle = (timingDiff / 150) * (Math.PI / 3.5) * sideMult;
                const isFoulByAngle = Math.abs(sprayAngle) > Math.PI / 4;

                if (contactQuality > 0.15) {
                    if (isFoulByAngle) {
                        res = { status: 'foul', type: 'FOUL', timingOffset: timingDiff, timingLabel, exitVelocity: ev * 0.6, launchAngle: la + 10, pitchLocation: targetLocation, pitchType: pitch.type };
                    } else if (contactQuality > 0.85) {
                        // BARREL Zone
                        if (la >= 24 && la <= 34) {
                            const dist = (ev * 3.8) + (la - 25) * 2;
                            res = { status: 'hit', type: 'HOMERUN', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, distance: dist, pitchLocation: targetLocation, pitchType: pitch.type };
                        } else {
                            res = { status: 'hit', type: 'DOUBLE', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: targetLocation, pitchType: pitch.type };
                        }
                    } else if (contactQuality > 0.6) {
                        // SOLID CONTACT Zone
                        const isGap = Math.abs(Math.abs(sprayAngle) - 0.45) < 0.15;
                        if (la >= 10 && la <= 25) {
                            res = { status: 'hit', type: isGap ? 'DOUBLE' : 'SINGLE', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: targetLocation, pitchType: pitch.type };
                        } else if (la > 25) {
                            res = { status: 'miss', type: 'OUT', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: targetLocation, pitchType: pitch.type };
                        } else {
                            res = { status: 'hit', type: 'SINGLE', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: targetLocation, pitchType: pitch.type };
                        }
                    } else if (contactQuality > 0.3) {
                        // WEAK CONTACT Zone
                        if (roll < 0.3 + contactMod) {
                            res = { status: 'hit', type: 'SINGLE', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: targetLocation, pitchType: pitch.type };
                        } else {
                            res = { status: 'miss', type: 'OUT', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: targetLocation, pitchType: pitch.type };
                        }
                    } else {
                        // VERY WEAK Contact but Fair - typically a groundout or soft pop
                        res = { status: 'miss', type: 'OUT', timingOffset: timingDiff, timingLabel, exitVelocity: ev * 0.7, launchAngle: la, pitchLocation: targetLocation, pitchType: pitch.type };
                    }
                } else if (absTiming < 180 * factor && pciPenalty > 0.1) {
                    // Tick / Foul Tip fallback for very poor contact quality
                    res = { status: 'foul', type: 'FOUL', timingOffset: timingDiff, timingLabel, exitVelocity: ev * 0.4, launchAngle: 45, pitchLocation: targetLocation, pitchType: pitch.type };
                } else {
                    res = { status: 'miss', type: 'STRIKE', timingOffset: timingDiff, timingLabel, pitchLocation: targetLocation, pitchType: pitch.type };
                }

                if (res.status === 'hit' || res.type === 'OUT' || res.type === 'FOUL') {
                    if (onContact) onContact([meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z], res.status === 'hit');

                    setShowTrail(false); // Reset trail for flight
                    initFlight(res);

                    // Restart trail for the ball escape path after a tiny delay
                    setTimeout(() => {
                        if (hasFinishedRef.current) setShowTrail(true);
                    }, 16);
                }
                complete(res);
            }


            if (currentZ > 1.3) {
                const isStrike = Math.abs(targetLocation.x) <= 0.35 && targetLocation.y >= 0.6 && targetLocation.y <= 1.6;
                setShowTrail(false); // Kill trail immediately on ball/strike
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

        // Handedness multiplier for spray angle
        // Righty: Early (<0) is Left Field (<0), Late (>0) is Right Field (>0)
        // Lefty: Early (<0) is Right Field (>0), Late (>0) is Left Field (<0)
        const sideMult = (teamStats.handedness === 'RIGHT') ? 1 : -1;
        const sprayAngle = (timing / 150) * (Math.PI / 3.5) * sideMult;

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
            <meshStandardMaterial color="#fff" emissive={ballColor} emissiveIntensity={2} />
        </mesh>
    );


    return (
        <group>
            {showTrail ? (
                <Trail
                    width={0.15} // Extra sharp
                    length={20}
                    color={ballColor}
                    attenuation={(t) => t * t * t * t}
                    opacity={0.8}
                    transparent
                >
                    {ballMesh}
                </Trail>
            ) : ballMesh}





        </group>
    );
}

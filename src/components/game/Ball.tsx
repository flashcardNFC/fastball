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
    onSettled?: () => void;
    ballRef?: React.MutableRefObject<THREE.Mesh | null>;
}

const BALL_GEOM = new THREE.SphereGeometry(MLB_CONSTANTS.BALL_RADIUS * 1.5, 16, 16);
const BALL_MAT = new THREE.MeshStandardMaterial({ color: "#fff" });

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
    onContact,
    onSettled,
    ballRef
}: BallProps) {

    const meshRef = useRef<THREE.Mesh>(null);
    const flightData = useRef<{ v0: THREE.Vector3; startTime: number } | null>(null);
    const [localHasProcessed, setLocalHasProcessed] = useState(false);
    const [showTrail, setShowTrail] = useState(false);
    const hasFinishedRef = useRef(false);
    const hasCalledSettled = useRef(false);

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
            hasCalledSettled.current = false;
        }
    }, [state, pitch]); // Include pitch to reset trail on new selections




    useFrame((threeState, delta) => {
        if (!meshRef.current) return;
        if (ballRef) ballRef.current = meshRef.current;

        // Unified delta for frame-rate independence in iterative physics
        const dt = Math.min(delta, 0.033);

        if (state === 'pitching' && !localHasProcessed) {
            const elapsed = (performance.now() - pitchStartTime) / 1000;

            // Initial positioning before pitch release
            if (elapsed < 0) {
                meshRef.current.position.copy(BALL_START_POS);
                if (showTrail) setShowTrail(false);
                return;
            }

            const velocity = pitch.speed * MLB_CONSTANTS.MPH_TO_MS;
            const zStart = difficulty === 'MLB' ? -16.6 : BALL_START_POS.z;
            const totalTime = Math.abs(zStart) / velocity;
            const progress = Math.min(elapsed / totalTime, 1.2);

            const currentZ = zStart + (velocity * elapsed);
            const breakFactor = Math.pow(progress, 2);
            const currentX = THREE.MathUtils.lerp(BALL_START_POS.x, targetLocation.x + (pitch.movement.x * breakFactor), Math.min(progress, 1));

            const T = totalTime;
            const vy0 = (targetLocation.y + (pitch.movement.y * 1) - BALL_START_POS.y - 0.5 * MLB_CONSTANTS.GRAVITY * T * T) / T;
            const currentY = BALL_START_POS.y + (vy0 * elapsed) + (0.5 * MLB_CONSTANTS.GRAVITY * elapsed * elapsed);

            meshRef.current.position.set(currentX, currentY, currentZ);

            // Decision/Contact Window Check
            const CONTACT_WINDOW_Z = 0.5;
            if (swingRef.current !== null && Math.abs(currentZ) < CONTACT_WINDOW_Z && !hasFinishedRef.current) {
                const SWING_DELAY = 112;
                const absolutePlateTime = pitchStartTime + totalTime * 1000;
                const timingDiff = (swingRef.current + SWING_DELAY) - absolutePlateTime;
                const absTiming = Math.abs(timingDiff);
                let res: PitchResult;

                const factor = difficulty === 'MLB' ? 1.0 : difficulty === 'PRO' ? 1.4 : 2.0;

                // 1. Calculate PCI Proximity
                const effectiveX = targetLocation.x + pitch.movement.x;
                const effectiveY = targetLocation.y + pitch.movement.y;
                const currentPci = pciPositionRef.current;
                const distH = currentPci.x - effectiveX;
                const distV = currentPci.y - effectiveY;
                let pciDist = Math.sqrt(distH * distH + distV * distV);
                const pciBonus = 1 - (teamStats.contact * 0.02);
                pciDist *= pciBonus;

                // 2. Exit Velocity Mapping
                let ev = 0;
                let timingLabel = "";
                const tPerfect = difficulty === 'MLB' ? 12 : difficulty === 'PRO' ? 22 : 35;
                const tGreat = difficulty === 'MLB' ? 28 : difficulty === 'PRO' ? 45 : 65;
                const tGood = difficulty === 'MLB' ? 45 : difficulty === 'PRO' ? 70 : 100;
                const tSolid = difficulty === 'MLB' ? 70 : difficulty === 'PRO' ? 100 : 150;

                if (absTiming <= tPerfect) {
                    ev = 106 + (1 - absTiming / tPerfect) * 16;
                    timingLabel = "PERFECT";
                } else if (absTiming <= tGreat) {
                    ev = 105 - ((absTiming - tPerfect) / (tGreat - tPerfect)) * 15;
                    timingLabel = "GREAT";
                } else if (absTiming <= tGood) {
                    ev = 89 - ((absTiming - tGreat) / (tGood - tGreat)) * 15;
                    timingLabel = "GOOD";
                } else if (absTiming <= tSolid) {
                    ev = 73 - ((absTiming - tGood) / (tSolid - tGood)) * 13;
                    timingLabel = absTiming < (70 * factor) ? "SOLID" : (timingDiff > 0 ? "LATE" : "EARLY");
                }

                const pciPenalty = Math.max(0, 1 - (pciDist / (0.45 * factor)));
                if (ev > 0) {
                    const powerBonus = absTiming <= tPerfect ? (1 + teamStats.power * 0.02) : 1.0;
                    ev = (ev * powerBonus) * (0.85 + 0.15 * pciPenalty);
                }

                // 3. Launch Angle
                const baseLA = 18;
                const launchSensitivity = 180;
                let la = baseLA - (distV * launchSensitivity);
                la += (Math.random() - 0.5) * 10 * (1 - pciPenalty);
                la = Math.max(-20, Math.min(80, la));

                // 4. Outcomes
                const isTimingPerfect = absTiming <= tPerfect;
                const isTimingGood = absTiming <= (45 * factor);
                const exactTimingLabel = Math.abs(Math.round(timingDiff)) + "MS " + (timingDiff > 0 ? "LATE" : "EARLY");
                const missThreshold = 0.55 * factor;
                const foulThreshold = 0.38 * factor;

                if (pciDist > missThreshold) {
                    res = { status: 'miss', type: 'STRIKE', timingOffset: timingDiff, timingLabel: exactTimingLabel, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                } else if (ev === 0) {
                    if (absTiming < (strikes >= 2 ? 120 : 140) * factor) {
                        res = { status: 'foul', type: 'FOUL', timingOffset: timingDiff, timingLabel: exactTimingLabel, exitVelocity: 75, launchAngle: 45, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                    } else {
                        res = { status: 'miss', type: 'STRIKE', timingOffset: timingDiff, timingLabel: exactTimingLabel, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                    }
                } else if (pciDist > foulThreshold && !isTimingPerfect) {
                    res = { status: 'foul', type: 'FOUL', timingOffset: timingDiff, timingLabel: exactTimingLabel, exitVelocity: Math.max(ev, 60), launchAngle: la, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                } else {
                    const barrelThreshold = (isTimingPerfect ? 0.45 : 0.15) * factor;
                    const solidThreshold = (isTimingGood ? 0.55 : 0.20) * factor;
                    const isBarrel = ev >= 95 && la >= 18 && la <= 38 && pciDist < barrelThreshold;
                    const isSolid = ev >= 88 && la >= 6 && la <= 40 && pciDist < solidThreshold;

                    if (isBarrel && ev >= 102) {
                        const dist = (ev * 3.9) + (la - 25) * 2;
                        res = { status: 'hit', type: 'HOMERUN', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, distance: dist, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                    } else if (isSolid || isBarrel) {
                        if (la > 40) {
                            res = { status: 'miss', type: 'OUT', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                        } else if (la < 8) {
                            res = { status: 'hit', type: 'SINGLE', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                        } else {
                            const hitType = (la > 20 && ev > 95) ? 'DOUBLE' : 'SINGLE';
                            res = { status: 'hit', type: hitType, timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                        }
                    } else {
                        let hitChance = 0.15;
                        if (ev >= 110) hitChance = 0.85;
                        else if (ev >= 105) hitChance = 0.75;
                        else if (ev >= 100) hitChance = 0.65;
                        else if (ev >= 95) hitChance = 0.55;
                        else if (ev >= 90) hitChance = 0.40;
                        else if (ev >= 80) hitChance = 0.25;

                        if (ev >= 55 && ev <= 90 && la < 10) hitChance += (teamStats.speed * 0.02);
                        if (la >= 8 && la <= 32) hitChance += 0.15;
                        if (la > 35) hitChance *= 0.2;
                        if (la > 50) hitChance = 0;

                        const vms = ev * MLB_CONSTANTS.MPH_TO_MS;
                        const approxDist = (vms * vms * Math.sin(2 * la * Math.PI / 180)) / Math.abs(MLB_CONSTANTS.GRAVITY);

                        if (approxDist > 121 && ev > 95 && la > 18 && la < 60) {
                            const dist = (ev * 3.9) + (la - 25) * 2;
                            res = { status: 'hit', type: 'HOMERUN', timingOffset: timingDiff, timingLabel, exitVelocity: ev, launchAngle: la, distance: dist, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                        } else if (Math.random() < hitChance && la < 38) {
                            const hitType = (la > 22 && ev >= 95) ? 'DOUBLE' : 'SINGLE';
                            res = { status: 'hit', type: hitType, timingOffset: timingDiff, timingLabel: ev >= 95 ? timingLabel : "PIECED", exitVelocity: ev, launchAngle: la, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                        } else {
                            res = { status: 'miss', type: 'OUT', timingOffset: timingDiff, timingLabel: exactTimingLabel, exitVelocity: ev, launchAngle: la, pitchLocation: { x: effectiveX, y: effectiveY }, pitchType: pitch.type };
                        }
                    }
                }

                if (res.status === 'hit' || res.status === 'foul' || res.type === 'OUT') {
                    const impactZ = 0.25;
                    const contactPci = pciPositionRef.current;
                    meshRef.current.position.set(
                        (res.status === 'hit' || res.status === 'foul') ? contactPci.x : meshRef.current.position.x,
                        (res.status === 'hit' || res.status === 'foul') ? contactPci.y : meshRef.current.position.y,
                        impactZ
                    );

                    if (onContact) onContact([meshRef.current.position.x, meshRef.current.position.y, impactZ], res.status === 'hit');
                    setShowTrail(false);
                    initFlight(res);
                    setTimeout(() => { if (hasFinishedRef.current) setShowTrail(true); }, 16);
                }
                complete(res);
            }

            if (currentZ > 1.3 && !hasFinishedRef.current) {
                const finalX = targetLocation.x + pitch.movement.x;
                const finalY = targetLocation.y + pitch.movement.y;
                const isStrikeZone = Math.abs(finalX) <= 0.35 && finalY >= 0.6 && finalY <= 1.6;
                const wasSwing = swingRef.current !== null;
                const status = wasSwing ? 'strike' : (isStrikeZone ? 'strike' : 'ball');
                const type = (wasSwing || isStrikeZone) ? 'STRIKE' : 'BALL';
                const timingLabel = wasSwing ? "TOO LATE" : undefined;

                hasFinishedRef.current = true;
                onFinish({ status, type, pitchLocation: { x: finalX, y: finalY }, timingLabel });
            }

            if (currentZ > 6.0) {
                setShowTrail(false);
                setLocalHasProcessed(true);
            }

        } else if (state === 'flight' && flightData.current) {
            const now = performance.now();
            const elapsed = (now - flightData.current.startTime) / 1000;
            const gravity = MLB_CONSTANTS.GRAVITY;

            // --- AIR DRAG (Fluid Dynamics Approximation) ---
            const currentVel = flightData.current.v0.length();
            if (currentVel > 0.1) {
                // Realistic drag for a baseball (Cd ~ 0.3)
                // a_drag = k * v^2 where k ~ 0.005
                const dragCoeff = 0.005;
                const dragFactor = dragCoeff * currentVel * dt;
                flightData.current.v0.x *= (1 - dragFactor);
                flightData.current.v0.z *= (1 - dragFactor);
                // Vertical drag is slightly less to preserve "moonshot" feel
                flightData.current.v0.y *= (1 - dragFactor * 0.9);
            }

            flightData.current.v0.y += gravity * dt;

            // Apply position updates with the calculated velocity
            meshRef.current.position.addScaledVector(flightData.current.v0, dt);

            const GROUND_Y = 0.037;
            if (meshRef.current.position.y < GROUND_Y) {
                meshRef.current.position.y = GROUND_Y;
                flightData.current.v0.y *= -0.45;
                flightData.current.v0.x *= 0.8;
                flightData.current.v0.z *= 0.8;

                if (Math.abs(flightData.current.v0.y) < 0.2) {
                    flightData.current.v0.y = 0;
                    if (!hasCalledSettled.current) {
                        hasCalledSettled.current = true;
                        if (onSettled) onSettled();
                    }
                }
            }

            if ((meshRef.current.position.z < -127 || Math.abs(meshRef.current.position.x) > 85) && !hasCalledSettled.current) {
                hasCalledSettled.current = true;
                setTimeout(() => { if (onSettled) onSettled(); }, 1200);
            }

            if (elapsed > 8) {
                flightData.current = null;
                setShowTrail(false);
                if (!hasCalledSettled.current) {
                    hasCalledSettled.current = true;
                    if (onSettled) onSettled();
                }
            }
        }
    });

    const complete = (res: PitchResult) => {
        if (hasFinishedRef.current) return;
        hasFinishedRef.current = true;
        setLocalHasProcessed(true);
        onFinish(res);
    };

    const initFlight = (res: PitchResult) => {
        const ev = res.exitVelocity || 70;
        const la = res.launchAngle || 20;
        const speedMs = (ev * MLB_CONSTANTS.MPH_TO_MS);
        const angleRad = (la * Math.PI) / 180;
        const timing = res.timingOffset || 0;

        // Handedness multiplier for spray angle
        const sideMult = (teamStats.handedness === 'RIGHT') ? 1 : -1;

        // Heavily exaggerated spray for foul balls to ensure they shoot off-screen
        let sprayAngle;
        if (res.type === 'FOUL') {
            // Foul balls now shoot at steep angles (70-85 degrees) away from the plate
            const foulBase = (Math.PI / 2.1);
            const timingVariance = (timing / 100) * (Math.PI / 6);
            sprayAngle = (foulBase * sideMult) + timingVariance;
        } else {
            sprayAngle = (timing / 150) * (Math.PI / 3.5) * sideMult;
        }

        // Initial velocity with air drag consideration (scaled for visual 108m fence)
        let dragScale = 0.92;

        // --- OUT PROTECTION ---
        // If it's a fly out, ensure it visually dies before the warning track (Fence at 122m)
        if (res.type === 'OUT' && la > 15) {
            const vms = speedMs;
            const theoreticalDist = (vms * vms * Math.sin(2 * angleRad)) / Math.abs(MLB_CONSTANTS.GRAVITY);
            if (theoreticalDist > 120) {
                // Scale velocity down so it lands around 110m (short of the fence)
                dragScale = Math.sqrt(110 / theoreticalDist);
            }
        }

        flightData.current = {
            startTime: performance.now(),
            v0: new THREE.Vector3(
                Math.sin(sprayAngle) * speedMs * Math.cos(angleRad) * dragScale,
                speedMs * Math.sin(angleRad) * dragScale,
                -Math.cos(sprayAngle) * speedMs * Math.cos(angleRad) * dragScale
            )
        };
    };

    if (state === 'idle' || state === 'windup') return null;

    const ballMesh = (
        <mesh ref={meshRef} geometry={BALL_GEOM}>
            <meshStandardMaterial color="#fff" emissive={ballColor} emissiveIntensity={2} />
        </mesh>
    );


    return (
        <group>
            {ballMesh}
            {showTrail && (
                <Trail
                    width={0.25}
                    length={40}
                    color={ballColor}
                    attenuation={(t) => t * t}
                />
            )}
        </group>
    );
}

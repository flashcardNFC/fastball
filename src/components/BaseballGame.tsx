import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Environment, AdaptiveDpr, AdaptiveEvents, BakeShadows, Preload } from '@react-three/drei';

// Libs
import { MLB_CONSTANTS } from '../lib/constants';
import { BALL_START_POS } from '../types/game';
import { generateTournament, simulateOutcome } from '../lib/tournament';
import { selectPitch, type PitchHistory } from '../lib/pitcherAI';
import { useGameStats } from '../hooks/useGameStats';
import { useProfile } from '../hooks/useProfile';

// Components - Game
import { Ball } from './game/Ball';
import { Bat } from './game/Bat';
import { Stadium } from './game/Stadium';
import { StrikeZone } from './game/StrikeZone';
import { HomePlate } from './game/HomePlate';
import { Camera } from './game/Camera';
import { ContactSpark } from './game/ContactSpark';
import { PCI } from './game/PCI';

// Components - UI
import { GlassCardUI } from './ui/GlassCard';
import { LeaderboardUI } from './ui/Leaderboard';
import { StartScreen } from './ui/StartScreen';
import TeamCreationUI from './TeamCreationUI';
import TournamentBracket from './TournamentBracket';

// Types
import type { Pitch, PitchResult, GameState, Difficulty, TeamStats, PlayerStats, TournamentState, Match, Team } from '../types/game';

interface BaseballGameProps {
    skipTeamCreation?: boolean;
    skipStartScreen?: boolean;
}

export default function BaseballGame({ skipTeamCreation = false, skipStartScreen = false }: BaseballGameProps) {
    // --- Hooks ---
    const { saveGameResult } = useGameStats();
    const { profile } = useProfile();
    const gameResultSavedRef = useRef(false);

    // --- State ---
    const [gameState, setGameState] = useState<GameState>({
        inning: 1, isTop: true, outs: 0, balls: 0, strikes: 0, score: { player: 0, computer: 0 }, runners: [false, false, false], history: [], gameOver: false, pitcherHandedness: Math.random() > 0.5 ? 'RIGHT' : 'LEFT'
    });

    const [machineState, setMachineState] = useState<'idle' | 'windup' | 'pitching' | 'flight' | 'result'>('idle');
    const [pitchResult, setPitchResult] = useState<PitchResult | null>(null);
    const [currentPitch, setCurrentPitch] = useState<Pitch>({ type: '4-SEAM', speed: 98, color: '#fff', movement: { x: 0, y: 0 } });
    const [targetLocation, setTargetLocation] = useState({ x: 0, y: 1.1 });
    const pciPositionRef = useRef({ x: 0, y: 1.1 });
    const [visualSwingTime, setVisualSwingTime] = useState<number | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('PRO');
    const [gameStarted, setGameStarted] = useState(skipStartScreen);
    const [teamStats, setTeamStats] = useState<TeamStats>({
        name: skipTeamCreation ? 'Dev Team' : '',
        speed: 5,
        contact: 5,
        power: 5,
        handedness: 'RIGHT'
    });
    const [showTeamCreation, setShowTeamCreation] = useState(!skipTeamCreation);
    const [opponentTeam, setOpponentTeam] = useState<TeamStats | null>(null);
    const [tournament, setTournament] = useState<TournamentState | null>(null);
    const [showBracket, setShowBracket] = useState(false);
    const [windupStartTime, setWindupStartTime] = useState<number>(0);
    const sideChangeTimeRef = useRef<number>(0);
    const [playerStats, setPlayerStats] = useState<PlayerStats>({
        hits: 0, atBats: 0, homeRuns: 0, tournamentWins: 0
    });
    const [matchStats, setMatchStats] = useState({ hits: 0, atBats: 0, homeRuns: 0 });
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const contactPosRef = useRef<[number, number, number]>([0, 0, 0]);
    const showContactSparkRef = useRef(false);
    const lastHitResultRef = useRef<'hit' | 'miss' | 'foul' | 'strike' | 'ball' | null>(null);
    const [contactKey, setContactKey] = useState(0);

    const pitchStartTime = useRef<number>(0);
    const swingRef = useRef<number | null>(null);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);
    const pciStartPos = useRef<{ x: number, y: number } | null>(null);
    const pitchHistoryRef = useRef<PitchHistory[]>([]);
    const gameBallRef = useRef<THREE.Mesh | null>(null);

    // --- Effects ---
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Persistence & Init
    useEffect(() => {
        const savedTournament = localStorage.getItem('fastball_tournament');
        if (savedTournament) try { setTournament(JSON.parse(savedTournament)); } catch (e) { }

        const savedTeam = localStorage.getItem('fastball_team');
        if (savedTeam) {
            try {
                const team = JSON.parse(savedTeam);
                setTeamStats(team);
                setShowTeamCreation(false);
            } catch (e) { }
        }

        const savedStats = localStorage.getItem('fastball_stats');
        if (savedStats) try { setPlayerStats(JSON.parse(savedStats)); } catch (e) { }

        const savedGameState = localStorage.getItem('fastball_game_state');
        if (savedGameState) try { setGameState(JSON.parse(savedGameState)); } catch (e) { }
    }, []);

    // Auto-set team name from user profile
    useEffect(() => {
        const username = profile?.username || profile?.display_name;
        if (username) {
            setTeamStats(prev => ({ ...prev, name: username }));
        }
    }, [profile]);

    // Save Effects
    useEffect(() => {
        if (gameStarted && !gameState.gameOver) localStorage.setItem('fastball_game_state', JSON.stringify(gameState));
        if (gameState.gameOver) {
            localStorage.removeItem('fastball_game_state');
            // Save game result to database (only once per game, MLB difficulty only)
            if (!gameResultSavedRef.current && difficulty === 'MLB') {
                gameResultSavedRef.current = true;
                saveGameResult({
                    hits: matchStats.hits,
                    atBats: matchStats.atBats,
                    homeRuns: matchStats.homeRuns,
                    tournamentWin: false,
                    score: gameState.score.player,
                });
            }
        }
    }, [gameState, gameStarted, matchStats.hits, matchStats.atBats, matchStats.homeRuns]);

    // Reset the saved flag and match stats when a new game starts
    useEffect(() => {
        if (gameStarted && !gameState.gameOver) {
            gameResultSavedRef.current = false;
            sideChangeTimeRef.current = performance.now();
            // Only reset match stats if it's the beginning of a fresh game
            if (gameState.inning === 1 && gameState.score.player === 0 && gameState.score.computer === 0 && gameState.outs === 0) {
                setMatchStats({ hits: 0, atBats: 0, homeRuns: 0 });
            }
        }
    }, [gameStarted, gameState.gameOver]);


    useEffect(() => { if (tournament) localStorage.setItem('fastball_tournament', JSON.stringify(tournament)); }, [tournament]);
    useEffect(() => { if (teamStats.name) localStorage.setItem('fastball_team', JSON.stringify(teamStats)); }, [teamStats]);
    useEffect(() => { localStorage.setItem('fastball_stats', JSON.stringify(playerStats)); }, [playerStats]);

    // --- Game Logic ---
    const startPitch = useCallback(() => {
        if (gameState.gameOver || machineState !== 'idle' || !gameStarted) return;
        setMachineState('windup');
        setWindupStartTime(performance.now());
        setPitchResult(null);
        swingRef.current = null;
        setVisualSwingTime(null);

        // Use smart pitcher AI for pitch selection, sequencing, and location
        const { pitch: p, target } = selectPitch(difficulty, gameState, pitchHistoryRef.current);

        setCurrentPitch(p);
        setTargetLocation(target);

        setTimeout(() => {
            setMachineState('pitching');
            pitchStartTime.current = performance.now();
        }, 1200);
    }, [gameState, machineState, gameStarted, difficulty]);

    const handleSwing = useCallback(() => {
        if (!gameStarted || machineState !== 'pitching' || visualSwingTime !== null) return;
        swingRef.current = performance.now();
        setVisualSwingTime(performance.now());
    }, [gameStarted, machineState, visualSwingTime]);

    const handleContact = useCallback((pos: [number, number, number], isHit: boolean) => {
        contactPosRef.current = pos;
        showContactSparkRef.current = true;
        lastHitResultRef.current = isHit ? 'hit' : 'miss';
        setContactKey(k => k + 1);

        setTimeout(() => { showContactSparkRef.current = false; setContactKey(k => k + 1); }, 350);
    }, []);

    const handleCompleteTournament = useCallback((userWon: boolean) => {
        if (difficulty === 'MLB' && userWon) {
            // We only save the tournament win here. Game stats were already saved by the end-of-game useEffect.
            saveGameResult({
                hits: 0,
                atBats: 0,
                homeRuns: 0,
                tournamentWin: true,
                score: gameState.score.player,
            });
        }
        if (userWon) {
            setPlayerStats(s => ({ ...s, tournamentWins: s.tournamentWins + 1 }));
        }
        setTournament(null);
        localStorage.removeItem('fastball_tournament');
        localStorage.removeItem('fastball_game_state');
        setShowBracket(false);
        setGameStarted(false);
    }, [difficulty, playerStats, gameState.score.player, saveGameResult]);

    const onPitchFinish = (result: PitchResult) => {
        setPitchResult(result);
        lastHitResultRef.current = result.status as any;

        // Track pitch history for AI sequencing
        pitchHistoryRef.current = [
            ...pitchHistoryRef.current.slice(-9), // keep last 10
            { type: currentPitch.type, location: targetLocation, result: result.status as any }
        ];

        // Reset history on new at-bat (walk, strikeout, hit, out)
        if (result.type === 'BALL' && gameState.balls === 3) pitchHistoryRef.current = [];
        if (result.type === 'STRIKE' && gameState.strikes === 2) pitchHistoryRef.current = [];
        if (result.status === 'hit' || result.type === 'OUT') pitchHistoryRef.current = [];

        if (result.status === 'hit' || result.type === 'OUT' || result.type === 'FOUL') {
            setMachineState('flight');

            // --- FOUL PACING ---
            // Force reset after 700ms for fouls so we don't wait for the ball to fly miles away
            if (result.type === 'FOUL') {
                setTimeout(() => {
                    handleSettled();
                }, 700);
            }
        } else {
            setMachineState('result');
            setTimeout(() => processResult(result), 1500);
        }
    };

    const maxInnings = tournament ? 9 : 3;
    const processResult = useCallback((result: PitchResult) => {
        setGameState(prev => {
            let { inning, isTop, outs, balls, strikes, score, runners } = { ...prev };
            let r = [...runners] as [boolean, boolean, boolean];
            let runs = 0;

            if (result.type === 'BALL') {
                balls++;
                if (balls === 4) {
                    const walk = advanceRunners(r, 'SINGLE');
                    r = walk.runners as [boolean, boolean, boolean];
                    runs += walk.runs;
                    balls = 0; strikes = 0;
                }
            } else if (result.type === 'STRIKE' || result.type === 'FOUL') {
                if (result.type === 'STRIKE' || strikes < 2) strikes++;
                if (strikes === 3) { outs++; strikes = 0; balls = 0; }
            } else if (result.type === 'OUT') {
                outs++; strikes = 0; balls = 0;
            } else if (result.status === 'hit') {
                const hit = advanceRunners(r, result.type as any);
                r = hit.runners as [boolean, boolean, boolean];
                runs += hit.runs;
                strikes = 0; balls = 0;
                if (result.type === 'HOMERUN') {
                    setPlayerStats(s => ({ ...s, homeRuns: s.homeRuns + 1 }));
                    setMatchStats(s => ({ ...s, homeRuns: s.homeRuns + 1 }));
                }
                setPlayerStats(s => ({ ...s, hits: s.hits + 1, atBats: s.atBats + 1 }));
                setMatchStats(s => ({ ...s, hits: s.hits + 1, atBats: s.atBats + 1 }));
            }

            if (result.type === 'OUT' || strikes === 3) {
                setPlayerStats(s => ({ ...s, atBats: s.atBats + 1 }));
                setMatchStats(s => ({ ...s, atBats: s.atBats + 1 }));
            }

            if (isTop) score.player += runs; else score.computer += runs;

            // Walk-off check: Bottom of last inning (or extra) and home team takes lead
            if (!isTop && inning >= maxInnings && score.computer > score.player) {
                return { ...prev, score, runners: [false, false, false], gameOver: true };
            }

            if (outs === 3) {
                const isRegulatedEnd = inning >= maxInnings;
                const isTied = score.player === score.computer;

                // Scenario A: Away (User) finishes Top of Last and is still losing
                if (isTop && isRegulatedEnd && score.computer > score.player) {
                    return { ...prev, score, runners: [false, false, false], gameOver: true };
                }

                // Scenario B: Home finishes Bottom of Last and result is decided
                if (!isTop && isRegulatedEnd && !isTied) {
                    return { ...prev, score, runners: [false, false, false], gameOver: true };
                }

                isTop = !isTop;
                outs = 0; balls = 0; strikes = 0;
                r = [false, false, false];

                if (isTop) {
                    inning++;
                }

                // Randomize pitcher handedness for the new inning/turn
                const pitcherHandedness = Math.random() > 0.5 ? 'RIGHT' : 'LEFT';
                sideChangeTimeRef.current = performance.now();

                return { ...prev, inning, isTop, outs, balls, strikes, score, runners: r as any, gameOver: false, pitcherHandedness };
            }

            return { ...prev, inning, isTop, outs, balls, strikes, score, runners: r as any, gameOver: false };
        });
        setMachineState('idle');
    }, [gameState.balls, gameState.strikes, gameState.outs, gameState.inning, gameState.isTop, gameState.score, gameState.runners, maxInnings]);

    const handleSettled = useCallback(() => {
        // Only process if we are still in flight mode to prevent double-processing (e.g. timeout + physics bounce)
        if (pitchResult && machineState === 'flight') {
            processResult(pitchResult);
        }
    }, [pitchResult, processResult, machineState]);

    const advanceRunners = (r: [boolean, boolean, boolean], type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN') => {
        let runs = 0;
        if (type === 'HOMERUN') {
            runs = r.filter(x => x).length + 1;
            return { runners: [false, false, false], runs };
        }
        if (type === 'TRIPLE') {
            runs = r.filter(x => x).length;
            return { runners: [false, false, true], runs };
        }
        if (type === 'DOUBLE') {
            if (r[2]) { runs++; r[2] = false; }
            if (r[1]) { runs++; r[1] = false; }
            if (r[0]) { r[2] = true; r[0] = false; }
            r[1] = true;
            return { runners: r, runs };
        }
        if (type === 'SINGLE') {
            if (r[2]) { runs++; r[2] = false; }
            if (r[1]) { if (Math.random() < 0.7) { runs++; r[1] = false; } else { r[2] = true; r[1] = false; } }
            if (r[0]) { if (Math.random() < 0.3) { r[2] = true; r[0] = false; } else { r[1] = true; r[0] = false; } }
            r[0] = true;
            return { runners: r, runs };
        }
        return { runners: r, runs };
    };

    const simulateInning = () => {
        setGameState(prev => {
            let { inning, isTop, outs, score } = { ...prev };
            const cpuRuns = Math.floor(Math.random() * 2) + (opponentTeam?.power || 1) * 0.3;
            const runsWon = Math.round(cpuRuns);
            if (!isTop) score.computer += runsWon; else score.player += runsWon;

            const isRegulatedEnd = inning >= maxInnings;
            const isTied = score.player === score.computer;

            // Scenario A: Away finishes Top of Last and is still losing
            if (isTop && isRegulatedEnd && score.computer > score.player) return { ...prev, score, gameOver: true };

            // Scenario B: Home finishes Bottom of Last and result is decided
            if (!isTop && isRegulatedEnd && !isTied) return { ...prev, score, gameOver: true };

            isTop = !isTop; outs = 0;
            if (isTop) {
                inning++;
            }
            const pitcherHandedness = Math.random() > 0.5 ? 'RIGHT' : 'LEFT';
            return { ...prev, inning, isTop, outs, score, pitcherHandedness };
        });
    };

    // AI Batter Control (When User is Pitching)
    useEffect(() => {
        if (!gameStarted || gameState.isTop || machineState !== 'pitching' || visualSwingTime !== null) return;

        // Determine AI swing timing and placement
        const skillFactor = difficulty === 'MLB' ? 0.9 : difficulty === 'PRO' ? 0.7 : 0.4;

        // 1. Move PCI toward target with some error
        const moveTimer = setTimeout(() => {
            const errorX = (Math.random() - 0.5) * (1 - skillFactor) * 0.8;
            const errorY = (Math.random() - 0.5) * (1 - skillFactor) * 0.8;
            pciPositionRef.current = {
                x: Math.max(-0.8, Math.min(0.8, targetLocation.x + errorX)),
                y: Math.max(0.2, Math.min(2.0, targetLocation.y + errorY))
            };
        }, 150 + Math.random() * 200);

        // 2. Schedule Swing
        // Calculate the "Perfect" timing first
        const velocity = currentPitch.speed * MLB_CONSTANTS.MPH_TO_MS;
        const totalTimeMs = (Math.abs(BALL_START_POS.z) / velocity) * 1000;
        const perfectTime = pitchStartTime.current + totalTimeMs;

        // AI Error (roughly -100ms to +100ms based on skill)
        const timingError = (Math.random() - 0.5) * 200 * (1 - skillFactor);
        const swingDelay = (perfectTime + timingError) - performance.now();

        const swingTimer = setTimeout(() => {
            // Chance to take the pitch if it's a ball
            // AI now accounts for pitch break (target + movement)
            const finalX = targetLocation.x + (currentPitch.movement?.x || 0);
            const finalY = targetLocation.y + (currentPitch.movement?.y || 0);
            const isStrike = Math.abs(finalX) <= 0.35 && finalY >= 0.6 && finalY <= 1.6;
            const takeChance = isStrike ? 0.1 : 0.6;

            if (Math.random() > takeChance) {
                handleSwing();
            }
        }, Math.max(0, swingDelay));

        return () => {
            clearTimeout(moveTimer);
            clearTimeout(swingTimer);
        };
    }, [machineState, gameStarted, gameState.isTop, targetLocation, difficulty, currentPitch, handleSwing]);

    // Auto-pitch: start next pitch after returning to idle
    // Use a longer delay (3s) after a side change (inning start), otherwise 1.5s
    useEffect(() => {
        if (machineState === 'idle' && gameStarted && !gameState.gameOver) {
            const timeSinceSideChange = performance.now() - sideChangeTimeRef.current;
            // If side change happened recently (within last 3s), wait 3s, otherwise standard 1s
            const delay = timeSinceSideChange < 3000 ? 3000 : 1000;
            const timer = setTimeout(() => startPitch(), delay);
            return () => clearTimeout(timer);
        }
    }, [machineState, gameStarted, gameState.gameOver, startPitch]);
    // --- Inputs ---
    useEffect(() => {
        const onDown = (e: MouseEvent | TouchEvent) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            if ('touches' in e && e.touches.length > 1) e.preventDefault();
            // We no longer trigger swing on down
        };

        const onUp = (e: MouseEvent | TouchEvent) => {
            if (!gameState.isTop) return; // Disable user swing on defense
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            if (machineState === 'pitching') {
                handleSwing();
            }
            handleEnd();
        };




        const handleStart = (e: MouseEvent | TouchEvent) => {
            if (!gameState.isTop) return; // Disable user PCI on defense
            if (!gameStarted || machineState === 'flight') return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            touchStartPos.current = { x: clientX, y: clientY };
            pciStartPos.current = { ...pciPositionRef.current };
        };


        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!gameState.isTop) return; // Disable user PCI on defense
            if (!gameStarted || machineState === 'flight') return;

            let clientX, clientY;
            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // Relative movement for both touch and mouse drag
            if (touchStartPos.current && pciStartPos.current) {
                // Increased sensitivity for even tighter, more responsive PCI control
                const dx = (clientX - touchStartPos.current.x) / window.innerWidth * 4.5;
                const dy = (touchStartPos.current.y - clientY) / window.innerHeight * 5.5;

                pciPositionRef.current = {
                    x: Math.max(-0.8, Math.min(0.8, pciStartPos.current.x + dx)),
                    y: Math.max(0.2, Math.min(2.0, pciStartPos.current.y + dy))
                };
            }
        };



        const handleEnd = () => {
            touchStartPos.current = null;
            pciStartPos.current = null;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!gameState.isTop) return;
            if (e.code === 'Space') handleSwing();
        };



        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousedown', handleStart);
        window.addEventListener('touchstart', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);


        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('touchstart', onDown);
            window.removeEventListener('mousedown', handleStart);
            window.removeEventListener('touchstart', handleStart);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);

        };
    }, [handleSwing, startPitch, machineState, gameStarted, isMobile]);


    // --- Render ---
    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100dvh',
                backgroundColor: '#000',
                color: '#fff',
                overflow: 'hidden',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'none',
                fontFamily: 'system-ui'
            }}
            onContextMenu={(e) => e.preventDefault()}
        >


            {/* HUD */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 8px) 6px 4px 6px' : '15px 20px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '4px' : '12px',
                pointerEvents: 'none',
                zIndex: 100
            }}>
                {/* Row 1: Home + Score + Count */}
                <div style={{ display: 'flex', gap: isMobile ? '2px' : '8px', width: '100%' }}>
                    <div onClick={() => setGameStarted(false)} style={{ flex: '0 0 auto', width: isMobile ? '32px' : '50px', height: isMobile ? '32px' : '50px', backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto', border: '1px solid rgba(255,255,255,0.1)', zIndex: 110 }}>
                        <svg width={isMobile ? "12" : "20"} height={isMobile ? "12" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    </div>
                    <GlassCardUI label={isMobile ? (teamStats.name || "AWAY").slice(0, 5) : (teamStats.name || "AWAY")} value={gameState.score.player} style={{ borderBottom: gameState.isTop ? '2px solid #ef4444' : 'none', flex: '1 1 0', minWidth: 0, padding: isMobile ? '3px 2px' : '8px' }} />
                    <GlassCardUI label={isMobile ? (opponentTeam?.name || "HOME").slice(0, 5) : (opponentTeam?.name || "HOME")} value={gameState.score.computer} style={{ borderBottom: !gameState.isTop ? '2px solid #3b82f6' : 'none', flex: '1 1 0', minWidth: 0, padding: isMobile ? '3px 2px' : '8px' }} />
                    <GlassCardUI label="B" value={gameState.balls} style={{ flex: '0 0 auto', width: isMobile ? '26px' : '45px', padding: isMobile ? '3px 1px' : '8px' }} />
                    <GlassCardUI label="S" value={gameState.strikes} style={{ flex: '0 0 auto', width: isMobile ? '26px' : '45px', padding: isMobile ? '3px 1px' : '8px' }} />
                    <GlassCardUI label="O" style={{ flex: '0 0 auto', width: isMobile ? '32px' : '60px', padding: isMobile ? '3px 1px' : '8px' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>{[...Array(2)].map((_, i) => (<div key={i} style={{ width: isMobile ? '5px' : '8px', height: isMobile ? '5px' : '8px', borderRadius: '50%', backgroundColor: i < gameState.outs ? '#facc15' : 'rgba(255,255,255,0.1)' }} />))}</div>
                    </GlassCardUI>
                </div>
                {/* Row 2 (mobile) / continued (desktop): Inning + Runners + Pitch */}
                <div style={{ display: 'flex', gap: isMobile ? '2px' : '8px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    <GlassCardUI label="INN" value={`${gameState.inning}${gameState.isTop ? '▲' : '▼'}`} style={{ flex: '0 0 auto', width: isMobile ? '36px' : '60px', padding: isMobile ? '3px 2px' : '8px' }} />
                    <GlassCardUI label="" style={{ flex: '0 0 auto', width: isMobile ? '32px' : '50px', padding: isMobile ? '3px 2px' : '8px' }}>
                        <div style={{ position: 'relative', width: isMobile ? '14px' : '20px', height: isMobile ? '14px' : '20px', border: '1px solid rgba(255,255,255,0.1)', transform: 'rotate(45deg)' }}>
                            <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: isMobile ? '5px' : '8px', height: isMobile ? '5px' : '8px', background: gameState.runners[0] ? '#facc15' : 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} />
                            <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: isMobile ? '5px' : '8px', height: isMobile ? '5px' : '8px', background: gameState.runners[1] ? '#facc15' : 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} />
                            <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: isMobile ? '5px' : '8px', height: isMobile ? '5px' : '8px', background: gameState.runners[2] ? '#facc15' : 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} />
                        </div>
                    </GlassCardUI>
                    <GlassCardUI label={pitchResult ? (isMobile ? currentPitch.type.slice(0, 4) : currentPitch.type) : '---'} value={pitchResult ? `${Math.round(currentPitch.speed)}` : '--'} style={{ color: pitchResult ? currentPitch.color : 'rgba(255,255,255,0.3)', flex: '0 0 auto', width: isMobile ? '44px' : '80px', padding: isMobile ? '3px 2px' : '8px' }} />
                </div>
            </div>

            {/* Hit Results */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', pointerEvents: 'none', zIndex: 200 }}>
                {pitchResult && machineState !== 'idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'slideInLeft 0.4s' }}>
                        {/* Result type badge — shown for ALL results */}
                        <div style={{
                            backgroundColor:
                                pitchResult.type === 'HOMERUN' ? 'rgba(239, 68, 68, 0.9)' :
                                    pitchResult.type === 'OUT' ? 'rgba(107, 114, 128, 0.9)' :
                                        pitchResult.type === 'FOUL' ? 'rgba(234, 179, 8, 0.85)' :
                                            pitchResult.type === 'STRIKE' ? 'rgba(239, 68, 68, 0.75)' :
                                                pitchResult.type === 'BALL' ? 'rgba(34, 197, 94, 0.75)' :
                                                    'rgba(59, 130, 246, 0.9)',
                            padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textAlign: 'center' }}>{pitchResult.type}</div>
                        </div>
                        {pitchResult.exitVelocity && (
                            <div style={{ backgroundColor: 'rgba(0,0,0,0.75)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <div style={{ fontSize: '7px', fontWeight: 900, color: '#aaa' }}>EXIT</div>
                                <div style={{ fontSize: '16px', fontWeight: 900, fontStyle: 'italic' }}>{Math.round(pitchResult.exitVelocity)}<span style={{ fontSize: '10px', fontStyle: 'normal', marginLeft: '3px', opacity: 0.5 }}>MPH</span></div>
                            </div>
                        )}
                        {pitchResult.type === 'HOMERUN' && pitchResult.distance && (
                            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <div style={{ fontSize: '8px', fontWeight: 900 }}>DISTANCE</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic' }}>{Math.round(pitchResult.distance)}<span style={{ fontSize: '12px' }}>FT</span></div>
                            </div>
                        )}
                        {pitchResult.timingLabel && (
                            <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: pitchResult.timingLabel === 'PERFECT' ? '#4ade80' : '#facc15' }}>{pitchResult.timingLabel}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Canvas */}
            <div style={{ position: 'absolute', inset: 0 }}>
                <Canvas
                    shadows
                    dpr={[1, 1.5]} // Limit pixel density for major perf gain on Retina/High-DPI
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                    camera={{ fov: 75 }}
                >
                    <Camera isUserPitching={!gameState.isTop} machineState={machineState} ballRef={gameBallRef} pitchResult={pitchResult} />

                    <color attach="background" args={['#020408']} />
                    <fog attach="fog" args={['#020408', 30, 250]} />

                    <ambientLight intensity={0.5} color="#fff8e1" />
                    <hemisphereLight args={['#fff8e1', '#081208', 0.6]} />

                    {/* Main Stadium "Floodlight" - Optimized Shadow Camera */}
                    <directionalLight
                        position={[40, 50, 40]}
                        intensity={2.8}
                        color="#ffffff"
                        castShadow
                        shadow-mapSize={[512, 512]} // Half resolution for speed
                        shadow-camera-left={-35}
                        shadow-camera-right={35}
                        shadow-camera-top={35}
                        shadow-camera-bottom={-35}
                        shadow-bias={-0.0005} // Reduce shadow acne
                    />

                    {/* Fill light for plate area - NO shadows for this one */}
                    <pointLight position={[0, 5, 2]} intensity={20} distance={15} color="#fff8e1" />

                    <Environment preset="night" />
                    <Stars radius={250} count={500} factor={3} fade speed={0.5} />

                    <Stadium machineState={machineState} windupStartTime={windupStartTime} pitcherHandedness={gameState.pitcherHandedness} />
                    <HomePlate />
                    <StrikeZone />
                    <PCI pciPositionRef={pciPositionRef} teamStats={teamStats} />
                    <Ball
                        state={machineState}
                        onFinish={onPitchFinish}
                        onContact={handleContact}
                        pitchStartTime={pitchStartTime.current}
                        pitch={currentPitch}
                        swingRef={swingRef}
                        targetLocation={targetLocation}
                        pciPositionRef={pciPositionRef}
                        difficulty={difficulty}
                        teamStats={teamStats}
                        strikes={gameState.strikes}
                        onSettled={handleSettled}
                        ballRef={gameBallRef}
                    />
                    <Bat
                        swingTime={visualSwingTime}
                        handedness={teamStats.handedness || 'LEFT'}
                        pciPositionRef={pciPositionRef}
                    />
                    <ContactSpark position={contactPosRef.current} active={showContactSparkRef.current} />

                    {/* Performance Utilities */}
                    <AdaptiveDpr pixelated />
                    <AdaptiveEvents />
                    <BakeShadows />
                    <Preload all />
                </Canvas>
            </div>

            {/* Overlays */}
            {showTeamCreation && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 500,
                    backgroundColor: '#000',
                    overflowY: 'auto',
                    padding: '40px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <TeamCreationUI
                        teamStats={teamStats}
                        setTeamStats={setTeamStats}
                        onContinue={() => setShowTeamCreation(false)}
                    />
                </div>
            )}

            {showBracket && tournament && <div style={{ position: 'absolute', inset: 0, zIndex: 400 }}><TournamentBracket tournament={tournament} onCompleteTournament={handleCompleteTournament} onPlayMatch={(matchId) => { const m = tournament.matches.find((x: Match) => x.id === matchId); if (m) { const oppId = m.team1Id === 'user' ? m.team2Id : m.team1Id; const opp = tournament.teams.find((t: Team) => t.id === oppId); setOpponentTeam(opp ? { ...opp.stats, name: opp.name } : null); setGameState({ ...gameState, inning: 1, isTop: true, outs: 0, score: { player: 0, computer: 0 }, runners: [false, false, false], gameOver: false, pitcherHandedness: Math.random() > 0.5 ? 'RIGHT' : 'LEFT' }); setGameStarted(true); setShowBracket(false); } }} onSimulateMatch={(matchId: string) => { setTournament((prev: any) => { if (!prev) return null; const m = prev.matches.find((x: Match) => x.id === matchId); if (!m || !m.team1Id || !m.team2Id) return prev; const t1 = prev.teams.find((t: Team) => t.id === m.team1Id); const t2 = prev.teams.find((t: Team) => t.id === m.team2Id); const result = simulateOutcome(m, t1, t2); const updated = prev.matches.map((x: Match) => x.id === matchId ? { ...x, winnerId: result.winnerId, score: result.score } : x); const final = updated.map((match: Match) => { if (match.id === m.nextMatchId) { if (!match.team1Id) return { ...match, team1Id: result.winnerId }; if (!match.team2Id) return { ...match, team2Id: result.winnerId }; } if (match.id === m.loserMatchId) { const loserId = result.winnerId === m.team1Id ? m.team2Id : m.team1Id; if (!match.team1Id) return { ...match, team1Id: loserId }; if (!match.team2Id) return { ...match, team2Id: loserId }; } return match; }); return { ...prev, matches: final }; }); }} /></div>}

            {!gameStarted && !showTeamCreation && (
                <StartScreen
                    isMobile={isMobile}
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                    gameState={gameState}
                    setGameState={setGameState}
                    gameStarted={gameStarted}
                    setGameStarted={setGameStarted}
                    setPitchResult={setPitchResult}
                    teamStats={teamStats}
                    generateTournament={generateTournament}
                    setTournament={setTournament}
                    setShowBracket={setShowBracket}
                    setShowLeaderboard={setShowLeaderboard}
                    onEditTeam={() => setShowTeamCreation(true)}
                />
            )}

            {!gameState.isTop && machineState === 'idle' && !gameState.gameOver && gameStarted && <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}><button onClick={simulateInning} style={{ padding: '16px 32px', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', fontWeight: 900, cursor: 'pointer' }}>SIMULATE INNING</button></div>}

            {gameState.gameOver && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(30px)' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: isMobile ? '120px' : '180px', fontWeight: 900, lineHeight: 1 }}>{gameState.score.player} - {gameState.score.computer}</div><div style={{ fontSize: '40px', fontWeight: 900, opacity: 0.5 }}>FINAL SCORE</div>{tournament ? <button onClick={() => { const userWon = gameState.score.player > gameState.score.computer; setTournament((prev: any) => { if (!prev) return null; const activeMatch = prev.matches.find((m: Match) => !m.winnerId && (m.team1Id === 'user' || m.team2Id === 'user')); if (!activeMatch) return prev; const winnerId = userWon ? 'user' : (activeMatch.team1Id === 'user' ? activeMatch.team2Id : activeMatch.team1Id); const loserId = userWon ? (activeMatch.team1Id === 'user' ? activeMatch.team2Id : activeMatch.team1Id) : 'user'; const updated = prev.matches.map((match: Match) => match.id === activeMatch.id ? { ...match, winnerId, score: { t1: gameState.score.player, t2: gameState.score.computer } } : match); const final = updated.map((match: Match) => { if (match.id === activeMatch.nextMatchId) { if (!match.team1Id) return { ...match, team1Id: winnerId }; if (!match.team2Id) return { ...match, team2Id: winnerId }; } if (match.id === activeMatch.loserMatchId) { if (!match.team1Id) return { ...match, team1Id: loserId }; if (!match.team2Id) return { ...match, team2Id: loserId }; } return match; }); return { ...prev, matches: final }; }); setGameStarted(false); setShowBracket(true); }} style={{ marginTop: '60px', padding: '24px 64px', backgroundColor: '#fff', color: '#000', borderRadius: '100px', fontSize: '24px', fontWeight: 900, cursor: 'pointer' }}>{gameState.score.player > gameState.score.computer ? 'VICTORY - CONTINUE' : 'DEFEAT - CONTINUE'}</button> : <button onClick={() => window.location.reload()} style={{ marginTop: '60px', padding: '24px 64px', backgroundColor: '#fff', color: '#000', borderRadius: '100px', fontSize: '24px', fontWeight: 900, cursor: 'pointer' }}>REMATCH</button>}</div></div>}

            {showLeaderboard && <div style={{ position: 'absolute', inset: 0, zIndex: 1000, backgroundColor: '#000' }}><LeaderboardUI userStats={playerStats} userName={teamStats.name} onClose={() => setShowLeaderboard(false)} /></div>}

            <style>{`
                @keyframes fadeInUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeInDown { from { transform: translateY(-40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideInLeft { from { transform: translateX(-40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .account-badge:hover { background-color: rgba(255,255,255,0.1) !important; transform: translateY(-2px); border-color: rgba(255,255,255,0.3) !important; }
            `}</style>
        </div>
    );
}

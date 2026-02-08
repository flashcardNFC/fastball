import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

// Libs
import { generateTournament, simulateOutcome } from '../lib/tournament';

// Components - Game
import { Ball } from './game/Ball';
import { Bat } from './game/Bat';
import { Stadium } from './game/Stadium';
import { StrikeZone } from './game/StrikeZone';
import { HomePlate } from './game/HomePlate';
import { Camera } from './game/Camera';

// Components - UI
import { GlassCardUI } from './ui/GlassCard';
import { LeaderboardUI } from './ui/Leaderboard';
import { StartScreen } from './ui/StartScreen';
import TeamCreationUI from './TeamCreationUI';
import TournamentBracket from './TournamentBracket';

// Types
import type { Pitch, PitchResult, GameState, Difficulty, TeamStats, PlayerStats, TournamentState, Match, Team } from '../types/game';

const getUsername = () => {
    return (window as any).BEAR_HANDS_USER || (window as any).username || null;
};

export default function BaseballGame() {
    // --- State ---
    const [gameState, setGameState] = useState<GameState>({
        inning: 1, isTop: true, outs: 0, balls: 0, strikes: 0, score: { player: 0, computer: 0 }, runners: [false, false, false], history: [], gameOver: false
    });

    const [machineState, setMachineState] = useState<'idle' | 'windup' | 'pitching' | 'flight' | 'result'>('idle');
    const [pitchResult, setPitchResult] = useState<PitchResult | null>(null);
    const [currentPitch, setCurrentPitch] = useState<Pitch>({ type: '4-SEAM', speed: 98, color: '#fff', movement: { x: 0, y: 0 } });
    const [targetLocation, setTargetLocation] = useState({ x: 0, y: 1.1 });
    const [visualSwingTime, setVisualSwingTime] = useState<number | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('PRO');
    const [gameStarted, setGameStarted] = useState(false);
    const [teamStats, setTeamStats] = useState<TeamStats>({ name: '', speed: 0, contact: 0, power: 0 });
    const [showTeamCreation, setShowTeamCreation] = useState(true);
    const [opponentTeam, setOpponentTeam] = useState<TeamStats | null>(null);
    const [tournament, setTournament] = useState<TournamentState | null>(null);
    const [showBracket, setShowBracket] = useState(false);
    const [windupStartTime, setWindupStartTime] = useState<number>(0);
    const [playerStats, setPlayerStats] = useState<PlayerStats>({
        hits: 0, atBats: 0, homeRuns: 0, tournamentWins: 0
    });
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const pitchStartTime = useRef<number>(0);
    const swingRef = useRef<number | null>(null);

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

        const externalUser = getUsername();
        if (externalUser) setTeamStats(prev => ({ ...prev, name: externalUser }));
    }, []);

    // Save Effects
    useEffect(() => {
        if (gameStarted && !gameState.gameOver) localStorage.setItem('fastball_game_state', JSON.stringify(gameState));
        if (gameState.gameOver) localStorage.removeItem('fastball_game_state');
    }, [gameState, gameStarted]);

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

        const rand = Math.random();
        let p: Pitch;
        if (difficulty === 'MLB') {
            if (rand < 0.6) p = { type: '4-SEAM', speed: 100 + Math.random() * 4, color: '#fff', movement: { x: 0.1, y: 0 } };
            else if (rand < 0.85) p = { type: 'SLIDER', speed: 91 + Math.random() * 3, color: '#ef4444', movement: { x: -0.5, y: -0.3 } };
            else p = { type: 'CURVEBALL', speed: 82 + Math.random() * 4, color: '#3b82f6', movement: { x: -0.3, y: -1.0 } };
        } else {
            if (rand < 0.5) p = { type: '4-SEAM', speed: 98 + Math.random() * 6, color: '#fff', movement: { x: 0.1, y: 0 } };
            else if (rand < 0.75) p = { type: 'SLIDER', speed: 88 + Math.random() * 4, color: '#ef4444', movement: { x: -0.4, y: -0.2 } };
            else p = { type: 'CURVEBALL', speed: 80 + Math.random() * 4, color: '#3b82f6', movement: { x: -0.2, y: -0.8 } };
        }

        setCurrentPitch(p);

        const isBall = Math.random() > (difficulty === 'MLB' ? 0.75 : 0.65);
        setTargetLocation({
            x: isBall ? (Math.random() > 0.5 ? 0.6 : -0.6) : (Math.random() - 0.5) * 0.6,
            y: isBall ? (Math.random() > 0.5 ? 2.0 : 0.4) : 0.7 + Math.random() * 0.8
        });

        setTimeout(() => {
            setMachineState('pitching');
            pitchStartTime.current = performance.now();
        }, 1200);
    }, [gameState.gameOver, machineState, gameStarted, difficulty]);

    const handleSwing = useCallback(() => {
        if (!gameStarted || machineState !== 'pitching' || visualSwingTime !== null) return;
        swingRef.current = performance.now();
        setVisualSwingTime(performance.now());
    }, [gameStarted, machineState, visualSwingTime]);

    const onPitchFinish = (result: PitchResult) => {
        setPitchResult(result);
        if (result.status === 'hit' || result.type === 'OUT') {
            setMachineState('flight');
            setTimeout(() => processResult(result), 2500);
        } else {
            setMachineState('result');
            setTimeout(() => processResult(result), 1500);
        }
    };

    const processResult = (result: PitchResult) => {
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
                if (result.type === 'HOMERUN') setPlayerStats(s => ({ ...s, homeRuns: s.homeRuns + 1 }));
                setPlayerStats(s => ({ ...s, hits: s.hits + 1, atBats: s.atBats + 1 }));
            }

            if (result.type === 'OUT' || strikes === 3) setPlayerStats(s => ({ ...s, atBats: s.atBats + 1 }));

            if (isTop) score.player += runs; else score.computer += runs;

            if (outs === 3) {
                if (!isTop && inning === 9) return { ...prev, score, runners: [false, false, false], gameOver: true };
                isTop = !isTop;
                outs = 0; balls = 0; strikes = 0;
                r = [false, false, false];
                if (isTop) inning++;
            }

            return { ...prev, inning, isTop, outs, balls, strikes, score, runners: r as any, gameOver: false };
        });
        setMachineState('idle');
    };

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

            if (!isTop && inning === 9) return { ...prev, score, gameOver: true };
            isTop = !isTop; outs = 0;
            if (isTop) inning++;
            return { ...prev, inning, isTop, outs, score };
        });
    };

    // --- Inputs ---
    useEffect(() => {
        const k = (e: KeyboardEvent) => { if (e.code === 'Space') handleSwing(); if (e.code === 'Enter') startPitch(); };
        const m = (e: MouseEvent) => { if ((e.target as HTMLElement).tagName !== 'BUTTON') handleSwing(); };
        const t = (e: TouchEvent) => { if ((e.target as HTMLElement).tagName !== 'BUTTON') { if (e.touches.length > 1) e.preventDefault(); handleSwing(); } };
        window.addEventListener('keydown', k); window.addEventListener('mousedown', m); window.addEventListener('touchstart', t, { passive: false });
        return () => { window.removeEventListener('keydown', k); window.removeEventListener('mousedown', m); window.removeEventListener('touchstart', t); };
    }, [handleSwing, startPitch]);

    // --- Render ---
    return (
        <div style={{ position: 'relative', width: '100%', height: '100dvh', backgroundColor: '#000', color: '#fff', overflow: 'hidden', userSelect: 'none', fontFamily: 'system-ui' }}>

            {/* HUD */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: isMobile ? '8px' : '10px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? '4px' : '8px', pointerEvents: 'none', zIndex: 100 }}>
                <div onClick={() => setGameStarted(false)} style={{ flex: isMobile ? '0 0 40px' : '0 0 50px', height: isMobile ? '40px' : '50px', backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto', border: '1px solid rgba(255,255,255,0.1)', zIndex: 110 }}>
                    <svg width={isMobile ? "16" : "20"} height={isMobile ? "16" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <GlassCardUI label={teamStats.name || "AWAY"} value={gameState.score.player} style={{ borderBottom: gameState.isTop ? '4px solid #ef4444' : 'none', flex: '1 1 50px', minWidth: isMobile ? '50px' : '70px', padding: isMobile ? '4px' : '8px', fontSize: isMobile ? '10px' : '12px' }} />
                <GlassCardUI label={opponentTeam?.name || "HOME"} value={gameState.score.computer} style={{ borderBottom: !gameState.isTop ? '4px solid #3b82f6' : 'none', flex: '1 1 50px', minWidth: isMobile ? '50px' : '70px', padding: isMobile ? '4px' : '8px', fontSize: isMobile ? '10px' : '12px' }} />
                <GlassCardUI label="B" value={gameState.balls} style={{ flex: '0 0 35px', minWidth: isMobile ? '35px' : '45px', padding: isMobile ? '4px' : '8px' }} />
                <GlassCardUI label="S" value={gameState.strikes} style={{ flex: '0 0 35px', minWidth: isMobile ? '35px' : '45px', padding: isMobile ? '4px' : '8px' }} />
                <GlassCardUI label="O" style={{ flex: '0 0 45px', minWidth: isMobile ? '45px' : '60px', padding: isMobile ? '4px' : '8px' }}>
                    <div style={{ display: 'flex', gap: isMobile ? '2px' : '4px' }}>{[...Array(2)].map((_, i) => (<div key={i} style={{ width: isMobile ? '6px' : '8px', height: isMobile ? '6px' : '8px', borderRadius: '50%', backgroundColor: i < gameState.outs ? '#facc15' : 'rgba(255,255,255,0.1)' }} />))}</div>
                </GlassCardUI>
                <GlassCardUI label="INN" value={`${gameState.inning}${gameState.isTop ? '▲' : '▼'}`} style={{ flex: '1 1 50px', minWidth: isMobile ? '50px' : '60px', padding: isMobile ? '4px' : '8px' }} />
                <GlassCardUI label="BASES" style={{ flex: '0 0 40px', minWidth: isMobile ? '40px' : '50px', padding: isMobile ? '4px' : '8px' }}>
                    <div style={{ position: 'relative', width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px', border: '1px solid rgba(255,255,255,0.1)', transform: 'rotate(45deg)' }}>
                        <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: isMobile ? '6px' : '8px', height: isMobile ? '6px' : '8px', background: gameState.runners[0] ? '#facc15' : 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: isMobile ? '6px' : '8px', height: isMobile ? '6px' : '8px', background: gameState.runners[1] ? '#facc15' : 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: isMobile ? '6px' : '8px', height: isMobile ? '6px' : '8px', background: gameState.runners[2] ? '#facc15' : 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} />
                    </div>
                </GlassCardUI>
                <GlassCardUI label={currentPitch.type} value={`${Math.round(currentPitch.speed)}`} style={{ color: currentPitch.color, minWidth: isMobile ? '60px' : '80px', padding: isMobile ? '4px' : '8px' }} />
            </div>

            {/* Hit Results */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', pointerEvents: 'none', zIndex: 200 }}>
                {pitchResult && machineState !== 'idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'slideInLeft 0.4s' }}>
                        {(pitchResult.status === 'hit' || pitchResult.type === 'OUT') && (
                            <div style={{ backgroundColor: pitchResult.type === 'HOMERUN' ? 'rgba(239, 68, 68, 0.9)' : pitchResult.type === 'OUT' ? 'rgba(107, 114, 128, 0.9)' : 'rgba(59, 130, 246, 0.9)', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <div style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textAlign: 'center' }}>{pitchResult.type}</div>
                            </div>
                        )}
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
                <Canvas shadows>
                    <Camera isUserPitching={!gameState.isTop} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 5, 2]} intensity={20} distance={15} color="#fff" />
                    <Stars radius={300} count={1000} factor={4} fade speed={1} />
                    <Stadium machineState={machineState} windupStartTime={windupStartTime} />
                    <HomePlate />
                    <StrikeZone />
                    <Ball
                        state={machineState}
                        onFinish={onPitchFinish}
                        pitchStartTime={pitchStartTime.current}
                        pitch={currentPitch}
                        swingRef={swingRef}
                        targetLocation={targetLocation}
                        difficulty={difficulty}
                        teamStats={teamStats}
                        strikes={gameState.strikes}
                    />
                    <Bat swingTime={visualSwingTime} />
                </Canvas>
            </div>

            {/* Overlays */}
            {showTeamCreation && <div style={{ position: 'absolute', inset: 0, zIndex: 500, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TeamCreationUI teamStats={teamStats} setTeamStats={setTeamStats} onContinue={() => setShowTeamCreation(false)} /></div>}

            {showBracket && tournament && <div style={{ position: 'absolute', inset: 0, zIndex: 400 }}><TournamentBracket tournament={tournament} onPlayMatch={(matchId) => { const m = tournament.matches.find((x: Match) => x.id === matchId); if (m) { const oppId = m.team1Id === 'user' ? m.team2Id : m.team1Id; const opp = tournament.teams.find((t: Team) => t.id === oppId); setOpponentTeam(opp ? { ...opp.stats, name: opp.name } : null); setGameState({ ...gameState, inning: 1, isTop: true, outs: 0, score: { player: 0, computer: 0 }, runners: [false, false, false], gameOver: false }); setGameStarted(true); setShowBracket(false); } }} onSimulateMatch={(matchId: string) => { setTournament((prev: any) => { if (!prev) return null; const m = prev.matches.find((x: Match) => x.id === matchId); if (!m || !m.team1Id || !m.team2Id) return prev; const t1 = prev.teams.find((t: Team) => t.id === m.team1Id); const t2 = prev.teams.find((t: Team) => t.id === m.team2Id); const result = simulateOutcome(m, t1, t2); const updated = prev.matches.map((x: Match) => x.id === matchId ? { ...x, winnerId: result.winnerId, score: result.score } : x); const final = updated.map((match: Match) => { if (match.id === m.nextMatchId) { if (!match.team1Id) return { ...match, team1Id: result.winnerId }; if (!match.team2Id) return { ...match, team2Id: result.winnerId }; } if (match.id === m.loserMatchId) { const loserId = result.winnerId === m.team1Id ? m.team2Id : m.team1Id; if (!match.team1Id) return { ...match, team1Id: loserId }; if (!match.team2Id) return { ...match, team2Id: loserId }; } return match; }); return { ...prev, matches: final }; }); }} /></div>}

            {!gameStarted && !showTeamCreation && <StartScreen isMobile={isMobile} difficulty={difficulty} setDifficulty={setDifficulty} gameState={gameState} setGameState={setGameState} gameStarted={gameStarted} setGameStarted={setGameStarted} setPitchResult={setPitchResult} teamStats={teamStats} generateTournament={generateTournament} setTournament={setTournament} setShowBracket={setShowBracket} setShowLeaderboard={setShowLeaderboard} />}

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


import type { Difficulty, TeamStats, GameState, TournamentState } from '../../types/game';

interface StartScreenProps {
    isMobile: boolean;
    difficulty: Difficulty;
    setDifficulty: (d: Difficulty) => void;
    gameState: GameState;
    setGameState: (s: GameState) => void;
    gameStarted: boolean;
    setGameStarted: (s: boolean) => void;
    setPitchResult: (r: any) => void;
    teamStats: TeamStats;
    generateTournament: (stats: TeamStats) => TournamentState;
    setTournament: (t: TournamentState) => void;
    setShowBracket: (s: boolean) => void;
    setShowLeaderboard: (s: boolean) => void;
    onEditTeam: () => void;
}

export function StartScreen({
    isMobile,
    difficulty,
    setDifficulty,
    gameState,
    setGameState,
    setGameStarted,
    setPitchResult,
    teamStats,
    generateTournament,
    setTournament,
    setShowBracket,
    setShowLeaderboard,
    onEditTeam
}: StartScreenProps) {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(40px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: isMobile ? '20px' : '40px',
            textAlign: 'center',
            overflowY: 'auto'
        }}>
            <div
                onClick={onEditTeam}
                className="account-badge"
                style={{
                    position: isMobile ? 'relative' : 'absolute',
                    top: isMobile ? 'auto' : '40px',
                    right: isMobile ? 'auto' : '40px',
                    marginBottom: isMobile ? '30px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: '10px 20px',
                    borderRadius: '100px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    animation: 'fadeInDown 0.6s',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    pointerEvents: 'auto'
                }}
            >
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: teamStats.name ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '14px',
                    boxShadow: teamStats.name ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none'
                }}>
                    {teamStats.name ? teamStats.name[0].toUpperCase() : '?'}
                </div>
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '10px', fontWeight: 900, opacity: 0.5, letterSpacing: '0.1em' }}>
                        {teamStats.name ? 'AUTHENTICATED' : 'GUEST MODE'} • {teamStats.handedness || 'LEFT'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: teamStats.name ? '#fff' : 'rgba(255,255,255,0.6)' }}>{teamStats.name || 'Sign In to Sync'}</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isMobile ? '20px' : '40px', marginTop: isMobile ? '20px' : '0' }}>
                <div style={{ fontSize: 'clamp(40px, 12vw, 120px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.05em', textAlign: 'center' }}>FASTBALL</div>
                <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', opacity: 0.4, marginTop: '-10px' }}>presented by BearHands</div>
            </div>

            <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '40px' : '60px', flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'center' }}>
                {(['ROOKIE', 'PRO', 'MLB'] as Difficulty[]).map(d => (
                    <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        style={{
                            padding: isMobile ? '12px 20px' : '16px 32px',
                            backgroundColor: difficulty === d ? '#fff' : 'rgba(255,255,255,0.05)',
                            color: difficulty === d ? '#000' : '#fff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            fontWeight: 900,
                            fontSize: isMobile ? '14px' : '18px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: difficulty === d ? 'scale(1.05)' : 'none',
                            flex: isMobile ? '1 1 30%' : 'auto'
                        }}
                    >
                        {d}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: isMobile ? '100%' : 'auto', maxWidth: '400px' }}>
                <button
                    onClick={() => { setGameStarted(true); setPitchResult(null); }}
                    style={{
                        padding: isMobile ? '20px 40px' : '24px 80px',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '100px',
                        fontSize: isMobile ? '22px' : '28px',
                        fontWeight: 900,
                        fontStyle: 'italic',
                        cursor: 'pointer',
                        boxShadow: '0 0 50px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.2s',
                        width: '100%'
                    }}
                >
                    <span>{gameState.inning > 1 || gameState.score.player > 0 || gameState.score.computer > 0 ? 'RESUME GAME' : 'PLAY 9 INNINGS'}</span>
                </button>

                {(gameState.inning > 1 || gameState.score.player > 0 || gameState.score.computer > 0) && (
                    <button
                        onClick={() => {
                            setGameState({
                                inning: 1, isTop: true, outs: 0, balls: 0, strikes: 0, score: { player: 0, computer: 0 }, runners: [false, false, false], history: [], gameOver: false
                            });
                            localStorage.removeItem('fastball_game_state');
                            setGameStarted(true);
                            setPitchResult(null);
                        }}
                        style={{
                            color: 'rgba(255,255,255,0.4)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 900,
                            textDecoration: 'underline',
                            marginBottom: '10px'
                        }}
                    >
                        START NEW GAME
                    </button>
                )}

                <button
                    onClick={() => {
                        const t = generateTournament(teamStats);
                        setTournament(t);
                        setShowBracket(true);
                        setGameStarted(false);
                    }}
                    style={{
                        padding: isMobile ? '16px 20px' : '16px 40px',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#fff',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '100px',
                        fontSize: isMobile ? '16px' : '20px',
                        fontWeight: 900,
                        fontStyle: 'italic',
                        cursor: 'pointer',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                    }}
                >
                    <span>ENTER TOURNAMENT</span>
                    <span style={{ fontSize: '10px', opacity: 0.6, fontStyle: 'normal' }}>8 TEAM • DOUBLE ELIM</span>
                </button>
            </div>

            <div
                onClick={() => setShowLeaderboard(true)}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    opacity: 0.7,
                    transition: 'all 0.3s',
                    marginTop: isMobile ? '30px' : '40px',
                    padding: '10px'
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em' }}>LEADERBOARD</span>
            </div>
        </div>
    );
}

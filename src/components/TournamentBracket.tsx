import type { TournamentState, Match, Team } from '../types/game';

interface TournamentBracketProps {
    tournament: TournamentState;
    onPlayMatch: (matchId: string) => void;
    onSimulateMatch: (matchId: string) => void;
}

const MatchNode = ({ match, teams, onPlay, onSimulate }: { match: Match, teams: Team[], onPlay: (id: string) => void, onSimulate: (id: string) => void, currentUserId: string }) => {
    const team1 = teams.find(t => t.id === match.team1Id);
    const team2 = teams.find(t => t.id === match.team2Id);

    const isReady = team1 && team2 && !match.winnerId;
    const isUserMatch = isReady && (team1?.isUser || team2?.isUser);
    const isFinished = !!match.winnerId;

    const positions: Record<string, { x: number, y: number }> = {
        'W1': { x: 50, y: 50 },
        'W2': { x: 50, y: 150 },
        'W3': { x: 50, y: 350 },
        'W4': { x: 50, y: 450 },
        'W5': { x: 250, y: 100 },
        'W6': { x: 250, y: 400 },
        'W7': { x: 450, y: 250 },
        'L1': { x: 250, y: 600 },
        'L2': { x: 250, y: 700 },
        'L3': { x: 450, y: 550 },
        'L4': { x: 450, y: 750 },
        'L5': { x: 650, y: 650 },
        'L6': { x: 650, y: 350 },
        'F1': { x: 850, y: 300 }
    };

    const pos = positions[match.id] || { x: 0, y: 0 };

    return (
        <div style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: '160px',
            backgroundColor: isFinished ? 'rgba(255,255,255,0.05)' : isReady ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isUserMatch ? '#ef4444' : isFinished ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: isUserMatch ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none',
            zIndex: 10,
            transition: 'all 0.3s'
        }}>
            <div style={{ fontSize: '10px', color: '#666', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                <span>{match.id}</span>
                {match.bracket === 'winners' ? <span style={{ color: '#4ade80' }}>WB</span> : match.bracket === 'losers' ? <span style={{ color: '#fb923c' }}>LB</span> : <span style={{ color: '#fbbf24' }}>FINAL</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: match.winnerId && match.winnerId !== team1?.id ? 0.3 : 1 }}>
                <span style={{ fontSize: '12px', fontWeight: team1?.isUser ? 900 : 500, color: team1?.isUser ? '#ef4444' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team1 ? team1.name : '-'}
                </span>
                {match.score && <span style={{ fontSize: '12px', fontWeight: 700 }}>{match.score.t1}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: match.winnerId && match.winnerId !== team2?.id ? 0.3 : 1 }}>
                <span style={{ fontSize: '12px', fontWeight: team2?.isUser ? 900 : 500, color: team2?.isUser ? '#ef4444' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team2 ? team2.name : '-'}
                </span>
                {match.score && <span style={{ fontSize: '12px', fontWeight: 700 }}>{match.score.t2}</span>}
            </div>

            {isReady && !isFinished && (
                <div style={{ marginTop: '4px' }}>
                    {isUserMatch ? (
                        <button onClick={() => onPlay(match.id)} style={{ width: '100%', padding: '4px', backgroundColor: '#ef4444', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>
                            PLAY
                        </button>
                    ) : (
                        <button onClick={() => onSimulate(match.id)} style={{ width: '100%', padding: '4px', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: '#ccc', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                            SIM
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default function TournamentBracket({ tournament, onPlayMatch, onSimulateMatch }: TournamentBracketProps) {
    const userTeam = tournament.teams.find(t => t.isUser);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            backgroundColor: '#050505',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #111 0%, #000 100%)',
            position: 'relative'
        }}>
            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
                <div style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic' }}>TOURNAMENT BRACKET</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Double Elimination • 8 Teams</div>
            </div>

            <div style={{ position: 'relative', width: '1100px', height: '900px', margin: '0 auto', transformOrigin: 'top center', transform: 'scale(0.9)', marginTop: '40px' }}>
                {tournament.matches.map(m => (
                    <MatchNode
                        key={m.id}
                        match={m}
                        teams={tournament.teams}
                        onPlay={onPlayMatch}
                        onSimulate={onSimulateMatch}
                        currentUserId={userTeam ? userTeam.id : ''}
                    />
                ))}
            </div>
        </div>
    );
}

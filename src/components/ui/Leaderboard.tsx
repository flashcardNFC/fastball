import type { PlayerStats } from '../../types/game';

interface LeaderboardUIProps {
    userStats: PlayerStats;
    userName: string;
    onClose: () => void;
}

export function LeaderboardUI({ userStats, userName, onClose }: LeaderboardUIProps) {
    const sampleRankings = [
        { rank: 1, name: "Shohei O.", avg: ".382", hr: 54, pts: 12450 },
        { rank: 2, name: "Aaron J.", avg: ".345", hr: 62, pts: 11980 },
        { rank: 3, name: "Betts M.", avg: ".312", hr: 31, pts: 10560 },
        { rank: 4, name: "Soto J.", avg: ".301", hr: 41, pts: 9870 },
        { rank: 5, name: "Freeman F.", avg: ".298", hr: 22, pts: 8430 }
    ];

    const stats = [
        { label: 'HITS', value: userStats.hits },
        { rank: 'AVG', value: userStats.atBats > 0 ? (userStats.hits / userStats.atBats).toFixed(3) : '.000' },
        { label: 'HR', value: userStats.homeRuns },
        { label: 'WINS', value: userStats.tournamentWins || 0 }
    ];

    return (
        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', top: '20px', left: '20px', cursor: 'pointer', zIndex: 100 }} onClick={onClose}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em' }}>WORLD RANKINGS</div>
                <div style={{ fontSize: '10px', color: '#ff4444', fontWeight: 900, letterSpacing: '0.3em', marginTop: '40px' }}>YOUR CAREER STATS</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', maxWidth: '600px', marginBottom: '60px' }}>
                {stats.map(s => (
                    <div key={s.label || s.rank} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '20px 10px', borderRadius: '15px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{s.value}</div>
                        <div style={{ fontSize: '9px', fontWeight: 900, opacity: 0.4 }}>{s.label || s.rank}</div>
                    </div>
                ))}
            </div>

            <div style={{ width: '100%', maxWidth: '600px' }}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff', padding: '5px 15px', borderRadius: '100px', backgroundColor: 'rgba(255,255,255,0.1)' }}>GLOBAL RANKINGS</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {sampleRankings.map(r => (
                        <div key={r.rank} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px 80px', padding: '15px 20px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 900, opacity: 0.3 }}>#{r.rank}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{r.name}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>{r.avg}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>{r.hr}</div>
                            <div style={{ fontSize: '12px', fontWeight: 900, textAlign: 'right', color: '#facc15' }}>{r.pts.toLocaleString()}</div>
                        </div>
                    ))}

                    <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px 80px', padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#ef4444' }}>#2.4k</div>
                        <div style={{ fontSize: '14px', fontWeight: 900 }}>{userName || "Rookie Player"}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>{(userStats.hits / (userStats.atBats || 1)).toFixed(3)}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>{userStats.homeRuns}</div>
                        <div style={{ fontSize: '12px', fontWeight: 900, textAlign: 'right', color: '#ef4444' }}>{userStats.hits * 105}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

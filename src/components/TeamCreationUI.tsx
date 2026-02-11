import type { TeamStats } from '../types/game';

interface TeamCreationUIProps {
    teamStats: TeamStats;
    setTeamStats: (stats: TeamStats) => void;
    onContinue: () => void;
}

export default function TeamCreationUI({ teamStats, setTeamStats, onContinue }: TeamCreationUIProps) {
    const TOTAL_POINTS = 5;
    const pointsRemaining = TOTAL_POINTS - teamStats.speed - teamStats.contact - teamStats.power;
    const canContinue = teamStats.name.trim() !== '' && pointsRemaining === 0;

    return (
        <div style={{ maxWidth: '500px', width: '100%', marginBottom: '40px', padding: '20px' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '20px', textAlign: 'center' }}>Create Your Team</div>

            <input
                type="text"
                placeholder="Enter Team Name"
                value={teamStats.name}
                onChange={(e) => setTeamStats({ ...teamStats, name: e.target.value })}
                style={{
                    width: '100%',
                    padding: '16px 24px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: 700,
                    textAlign: 'center',
                    marginBottom: '30px',
                    outline: 'none'
                }}
            />

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>POINTS REMAINING</div>
                <div style={{ fontSize: '48px', fontWeight: 900, color: pointsRemaining === 0 ? '#4ade80' : '#facc15' }}>
                    {pointsRemaining}
                </div>
            </div>

            {/* Handedness Selection */}
            <div style={{ marginBottom: '30px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', textAlign: 'center', fontWeight: 900, letterSpacing: '0.1em' }}>BATTER HANDEDNESS</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {(['LEFT', 'RIGHT'] as const).map(h => (
                        <button
                            key={h}
                            onClick={() => setTeamStats({ ...teamStats, handedness: h })}
                            style={{
                                flex: 1,
                                padding: '12px',
                                backgroundColor: (teamStats.handedness || 'LEFT') === h ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                transform: (teamStats.handedness || 'LEFT') === h ? 'scale(1.05)' : 'none'
                            }}
                        >
                            {h}
                        </button>
                    ))}
                </div>
            </div>

            {[
                { key: 'speed' as const, label: 'SPEED', desc: 'Extra base hits', color: '#3b82f6' },
                { key: 'contact' as const, label: 'CONTACT', desc: 'More singles, fewer HRs', color: '#10b981' },
                { key: 'power' as const, label: 'POWER', desc: 'More HRs, fewer singles', color: '#ef4444' }
            ].map(({ key, label, desc, color }) => {
                const value = teamStats[key];
                return (
                    <div key={key} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color }}>{label}</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{desc}</div>
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 900, color }}>{value}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setTeamStats({ ...teamStats, [key]: Math.max(0, value - 1) })}
                                disabled={value === 0}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: value === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: value === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                                    fontSize: '20px',
                                    fontWeight: 900,
                                    cursor: value === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                −
                            </button>
                            <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} style={{ flex: 1, height: '12px', backgroundColor: i < value ? color : 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                                ))}
                            </div>
                            <button
                                onClick={() => setTeamStats({ ...teamStats, [key]: Math.min(5, value + 1) })}
                                disabled={pointsRemaining === 0 || value === 5}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: (pointsRemaining === 0 || value === 5) ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: (pointsRemaining === 0 || value === 5) ? 'rgba(255,255,255,0.3)' : '#fff',
                                    fontSize: '20px',
                                    fontWeight: 900,
                                    cursor: (pointsRemaining === 0 || value === 5) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                +
                            </button>
                        </div>
                    </div>
                );
            })}

            <button
                onClick={onContinue}
                disabled={!canContinue}
                style={{
                    width: '100%',
                    padding: '20px 60px',
                    backgroundColor: !canContinue ? 'rgba(255,255,255,0.1)' : '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '100px',
                    fontSize: '24px',
                    fontWeight: 900,
                    fontStyle: 'italic',
                    cursor: !canContinue ? 'not-allowed' : 'pointer',
                    boxShadow: !canContinue ? 'none' : '0 0 50px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.2s',
                    opacity: !canContinue ? 0.5 : 1
                }}
            >
                CONTINUE
            </button>
        </div>
    );
}

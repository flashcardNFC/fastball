import React, { useState } from 'react';
import { PlayerStats } from '../../types/game';

interface LeaderboardUIProps {
    userStats: PlayerStats;
    userName: string;
    onClose: () => void;
}

export function LeaderboardUI({ userStats, userName, onClose }: LeaderboardUIProps) {
    const [activeTab, setActiveTab] = useState<'wins' | 'avg' | 'hr'>('wins');
    const isSmallMobile = window.innerWidth < 480;

    const avg = userStats.atBats > 0 ? (userStats.hits / userStats.atBats).toFixed(3) : ".000";

    // Removed sample data per user request
    const USER_DATA = [
        { name: userName || "YOU", value: activeTab === 'wins' ? userStats.tournamentWins.toString() : activeTab === 'avg' ? avg : userStats.homeRuns.toString(), isUser: true }
    ];

    // Filter to only show the user if they have data, or just show the user row
    const currentData = (userStats.atBats > 0 || userStats.tournamentWins > 0) ? USER_DATA : [];

    return (
        <div style={{
            height: '100dvh',
            padding: isSmallMobile ? '20px 15px' : '40px',
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            fontFamily: 'system-ui',
            overflowY: 'auto'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: isSmallMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isSmallMobile ? 'flex-start' : 'center',
                marginBottom: isSmallMobile ? '20px' : '40px',
                gap: '15px'
            }}>
                <div>
                    <h1 style={{ fontSize: isSmallMobile ? '32px' : '48px', fontWeight: 900, fontStyle: 'italic', margin: 0 }}>WORLD RANKINGS</h1>
                    <p style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '0.1em', fontWeight: 700, margin: '4px 0 0 0' }}>FASTBALL GLOBAL LEADERS</p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '100px',
                        color: '#fff',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontSize: '14px',
                        alignSelf: isSmallMobile ? 'flex-end' : 'auto'
                    }}
                >
                    CLOSE
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {(['wins', 'avg', 'hr'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            padding: isSmallMobile ? '12px 10px' : '16px',
                            backgroundColor: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.05)',
                            color: activeTab === tab ? '#000' : '#fff',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            fontSize: isSmallMobile ? '10px' : '12px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab === 'wins' ? 'WINS' : tab === 'avg' ? 'AVG' : 'HR'}
                    </button>
                ))}
            </div>

            <div style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: isSmallMobile ? '16px' : '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                overflow: 'hidden',
                marginBottom: '20px'
            }}>
                {currentData.length > 0 ? currentData.map((entry, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: isSmallMobile ? '15px 20px' : '20px 30px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            animation: 'fadeInUp 0.3s'
                        }}
                    >
                        <span style={{ width: isSmallMobile ? '30px' : '40px', fontSize: isSmallMobile ? '16px' : '20px', fontWeight: 900, opacity: 0.3 }}>-</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: isSmallMobile ? '14px' : '18px', fontWeight: 800, color: '#3b82f6' }}>
                                {entry.name} <span style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: '#3b82f6', borderRadius: '100px', color: '#fff', verticalAlign: 'middle', marginLeft: '6px' }}>YOU</span>
                            </div>
                        </div>
                        <span style={{ fontSize: isSmallMobile ? '20px' : '24px', fontWeight: 900, fontStyle: 'italic' }}>{entry.value}</span>
                    </div>
                )) : (
                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.3 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>NO DATA RECORDED</div>
                        <div style={{ fontSize: '10px', marginTop: '4px' }}>PLAY A GAME TO SEE YOUR RANKING</div>
                    </div>
                )}
            </div>
        </div>
    );
}

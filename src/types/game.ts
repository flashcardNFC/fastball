import * as THREE from 'three';

export interface Team {
    id: string;
    name: string;
    stats: { speed: number; contact: number; power: number };
    color: string;
    isUser: boolean;
}

export interface Match {
    id: string;
    round: number;
    bracket: 'winners' | 'losers' | 'finals';
    team1Id: string | null;
    team2Id: string | null;
    winnerId: string | null;
    score: { t1: number; t2: number } | null;
    nextMatchId?: string;
    loserMatchId?: string;
}

export interface TournamentState {
    teams: Team[];
    matches: Match[];
    currentMatchId: string | null;
    championId: string | null;
}

export interface Pitch {
    type: '4-SEAM' | 'SLIDER' | 'CURVEBALL' | 'CHANGEUP';
    speed: number;
    color: string;
    movement: { x: number; y: number };
}

export interface PitchResult {
    status: 'pending' | 'hit' | 'miss' | 'foul' | 'strike' | 'ball';
    type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'OUT' | 'FOUL' | 'STRIKE' | 'BALL';
    timingOffset?: number;
    timingLabel?: string;
    exitVelocity?: number;
    launchAngle?: number;
    distance?: number;
    pitchLocation: { x: number; y: number };
    pitchType?: string;
}

export interface GameState {
    inning: number;
    isTop: boolean;
    outs: number;
    balls: number;
    strikes: number;
    score: { player: number; computer: number };
    runners: [boolean, boolean, boolean];
    history: ('H' | 'O')[];
    gameOver: boolean;
}

export type Difficulty = 'ROOKIE' | 'PRO' | 'MLB';

export interface TeamStats {
    name: string;
    speed: number;
    contact: number;
    power: number;
}

export interface PlayerStats {
    hits: number;
    atBats: number;
    homeRuns: number;
    tournamentWins: number;
}

export const BALL_START_POS = new THREE.Vector3(0, 1.8, -18.44);

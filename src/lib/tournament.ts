
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
    loserMatchId?: string; // Only for winners bracket matches
    x?: number; // Visual X position (optional)
    y?: number; // Visual Y position (optional)
}

export interface TournamentState {
    teams: Team[];
    matches: Match[];
    currentMatchId: string | null; // If user is playing
    championId: string | null;
}

const PUN_TEAMS = [
    "Son of a Pitch",
    "Base Invaders",
    "Pitches Be Crazy",
    "Bat Attitudes",
    "The Umpire Strikes Back",
    "Designated Drinkers",
    "Scared Hitless",
    "No Hit Sherlock",
    "Between the Lines",
    "Quit Your Pitching",
    "Master Batters",
    "Hit for Brains",
    "Bench Warmers",
    "Catch 22",
    "Field of Screams"
];

const COLORS = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];

export const generateTournament = (userTeamStats: any): TournamentState => {
    // 1. Generate Teams
    const teams: Team[] = [];

    // User Team
    teams.push({
        id: 'user',
        name: userTeamStats.name || "My Team",
        stats: userTeamStats,
        color: '#ffffff', // User is always White/Home usually? Or distinct.
        isUser: true
    });

    // AI Teams
    const shuffledPuns = [...PUN_TEAMS].sort(() => 0.5 - Math.random());
    const shuffledColors = [...COLORS].sort(() => 0.5 - Math.random());

    for (let i = 0; i < 7; i++) {
        // Let's make AI teams valid (sum around 5-8 to be competitive)
        const s = Math.floor(Math.random() * 4) + 1;
        const c = Math.floor(Math.random() * 4) + 1;
        const p = Math.floor(Math.random() * 4) + 1;

        teams.push({
            id: `ai-${i}`,
            name: shuffledPuns[i],
            stats: { speed: s, contact: c, power: p },
            color: shuffledColors[i],
            isUser: false
        });
    }

    // Shuffle Teams for seeding
    const seeding = [...teams].sort(() => 0.5 - Math.random());

    // 2. Generate Bracket Matches (8 Team Double Elimination)
    const matches: Match[] = [];
    const createMatch = (id: string, round: number, bracket: 'winners' | 'losers' | 'finals', nextWinner?: string, nextLoser?: string): Match => ({
        id, round, bracket, team1Id: null, team2Id: null, winnerId: null, score: null, nextMatchId: nextWinner, loserMatchId: nextLoser
    });

    // Grand Final
    const F1 = createMatch('F1', 5, 'finals', undefined, undefined);

    // WB R3 (Winners Final) & LB R4 (Losers Final)
    const L6 = createMatch('L6', 4, 'losers', 'F1', undefined); // Winner to F1
    const W7 = createMatch('W7', 3, 'winners', 'F1', 'L6');     // Winner to F1, Loser to L6

    // LB R3
    const L5 = createMatch('L5', 3, 'losers', 'L6', undefined);

    // WB R2 & LB R2
    const L4 = createMatch('L4', 2, 'losers', 'L5', undefined);
    const L3 = createMatch('L3', 2, 'losers', 'L5', undefined);

    const W6 = createMatch('W6', 2, 'winners', 'W7', 'L3'); // Loser to L3 (Cross)
    const W5 = createMatch('W5', 2, 'winners', 'W7', 'L4'); // Loser to L4 (Cross)

    // LB R1
    const L2 = createMatch('L2', 1, 'losers', 'L4', undefined);
    const L1 = createMatch('L1', 1, 'losers', 'L3', undefined);

    // WB R1
    const W4 = createMatch('W4', 1, 'winners', 'W6', 'L2');
    const W3 = createMatch('W3', 1, 'winners', 'W6', 'L2');
    const W2 = createMatch('W2', 1, 'winners', 'W5', 'L1');
    const W1 = createMatch('W1', 1, 'winners', 'W5', 'L1');

    // Seeding
    W1.team1Id = seeding[0].id; W1.team2Id = seeding[7].id; // 1 vs 8
    W2.team1Id = seeding[3].id; W2.team2Id = seeding[4].id; // 4 vs 5
    W3.team1Id = seeding[2].id; W3.team2Id = seeding[5].id; // 3 vs 6
    W4.team1Id = seeding[1].id; W4.team2Id = seeding[6].id; // 2 vs 7

    matches.push(W1, W2, W3, W4, L1, L2, W5, W6, L3, L4, L5, W7, L6, F1);

    return {
        teams,
        matches,
        currentMatchId: null,
        championId: null
    };
};

export const simulateOutcome = (_match: Match, team1: Team, team2: Team): { winnerId: string, score: { t1: number, t2: number } } => {
    // Simple simulation based on stats + randomness
    const t1Score = Math.floor(Math.random() * 5) + (team1.stats.power * 0.5);
    const t2Score = Math.floor(Math.random() * 5) + (team2.stats.power * 0.5);

    // Avoid Draws
    let s1 = Math.round(t1Score);
    let s2 = Math.round(t2Score);
    if (s1 === s2) {
        if (Math.random() > 0.5) s1++; else s2++;
    }

    return {
        winnerId: s1 > s2 ? team1.id : team2.id,
        score: { t1: s1, t2: s2 }
    };
};

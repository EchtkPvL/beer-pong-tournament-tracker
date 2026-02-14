import { nanoid } from 'nanoid';
import type { GeneratedBracket, TeamSeed, BracketMatch, BracketRound } from './types';

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function getRoundName(roundsTotal: number, roundIndex: number): string {
  const remaining = roundsTotal - roundIndex;
  if (remaining === 1) return 'Finale';
  if (remaining === 2) return 'Halbfinale';
  if (remaining === 3) return 'Viertelfinale';
  if (remaining === 4) return 'Achtelfinale';
  return `Runde ${roundIndex + 1}`;
}

/**
 * Standard seeding: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
 * Ensures top seeds are spread and get byes first
 */
function generateSeedOrder(bracketSize: number): number[] {
  if (bracketSize === 1) return [1];
  if (bracketSize === 2) return [1, 2];

  const rounds = Math.log2(bracketSize);
  let seeds = [1, 2];

  for (let round = 1; round < rounds; round++) {
    const newSeeds: number[] = [];
    const sum = Math.pow(2, round) + 1;
    for (const seed of seeds) {
      newSeeds.push(seed);
      newSeeds.push(sum - seed);
    }
    seeds = newSeeds;
  }

  return seeds;
}

export function generateSingleEliminationBracket(
  eventId: number,
  teams: TeamSeed[]
): GeneratedBracket {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams');
  }

  const bracketSize = nextPowerOf2(teams.length);
  const totalRounds = Math.log2(bracketSize);
  const seedOrder = generateSeedOrder(bracketSize);

  // Create rounds
  const rounds: BracketRound[] = [];
  for (let i = 0; i < totalRounds; i++) {
    rounds.push({
      id: nanoid(),
      roundNumber: i + 1,
      phase: 'winners',
      name: getRoundName(totalRounds, i),
    });
  }

  // Create all matches for each round
  const allMatches: BracketMatch[][] = [];

  for (let r = 0; r < totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r + 1);
    const roundMatches: BracketMatch[] = [];

    for (let m = 0; m < matchCount; m++) {
      roundMatches.push({
        id: nanoid(),
        matchNumber: 0,
        scheduledRound: null,
        team1Id: null,
        team2Id: null,
        isBye: false,
        bracketPosition: `W-R${r + 1}-M${m + 1}`,
        nextMatchId: null,
        loserNextMatchId: null,
        roundId: rounds[r].id,
        groupId: null,
      });
    }

    allMatches.push(roundMatches);
  }

  // Link matches: winner of match m in round r goes to match floor(m/2) in round r+1
  for (let r = 0; r < totalRounds - 1; r++) {
    for (let m = 0; m < allMatches[r].length; m++) {
      const nextMatchIndex = Math.floor(m / 2);
      allMatches[r][m].nextMatchId = allMatches[r + 1][nextMatchIndex].id;
    }
  }

  // Seed teams into first round
  // Sort teams by seed (or order given)
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));

  // Map seed positions to team slots
  for (let i = 0; i < bracketSize; i++) {
    const seedPos = seedOrder[i]; // 1-indexed seed position
    const team = seedPos <= sortedTeams.length ? sortedTeams[seedPos - 1] : null;

    // Map to first round match: position i goes to match floor(i/2), slot i%2
    const matchIndex = Math.floor(i / 2);
    const match = allMatches[0][matchIndex];

    if (i % 2 === 0) {
      match.team1Id = team?.id || null;
    } else {
      match.team2Id = team?.id || null;
    }
  }

  // Handle byes: if a match has only one team, mark as bye and auto-advance
  for (const match of allMatches[0]) {
    if (match.team1Id && !match.team2Id) {
      match.isBye = true;
    } else if (!match.team1Id && match.team2Id) {
      match.isBye = true;
    } else if (!match.team1Id && !match.team2Id) {
      // Both empty - this shouldn't happen with proper seeding but handle it
      match.isBye = true;
    }
  }

  const flatMatches = allMatches.flat();

  return { rounds, matches: flatMatches };
}

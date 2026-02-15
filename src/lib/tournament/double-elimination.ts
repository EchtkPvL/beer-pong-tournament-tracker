import { nanoid } from 'nanoid';
import type { GeneratedBracket, TeamSeed, BracketMatch, BracketRound } from './types';

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function generateSeedOrder(bracketSize: number): number[] {
  if (bracketSize === 1) return [1];
  if (bracketSize === 2) return [1, 2];

  const rounds = Math.log2(bracketSize);
  let seeds = [1, 2];

  for (let round = 1; round < rounds; round++) {
    const newSeeds: number[] = [];
    const sum = Math.pow(2, round + 1) + 1;
    for (const seed of seeds) {
      newSeeds.push(seed);
      newSeeds.push(sum - seed);
    }
    seeds = newSeeds;
  }

  return seeds;
}

export function generateDoubleEliminationBracket(
  eventId: number,
  teams: TeamSeed[]
): GeneratedBracket {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams');
  }

  const bracketSize = nextPowerOf2(teams.length);
  const winnersRounds = Math.log2(bracketSize);
  // Losers bracket has roughly 2*(winnersRounds-1) rounds
  const losersRoundCount = 2 * (winnersRounds - 1);

  const rounds: BracketRound[] = [];
  const allWinnersMatches: BracketMatch[][] = [];
  const allLosersMatches: BracketMatch[][] = [];

  // Create winners bracket rounds
  for (let i = 0; i < winnersRounds; i++) {
    rounds.push({
      id: nanoid(),
      roundNumber: i + 1,
      phase: 'winners',
      name: `Gewinnerrunde ${i + 1}`,
    });
  }

  // Create losers bracket rounds
  for (let i = 0; i < losersRoundCount; i++) {
    rounds.push({
      id: nanoid(),
      roundNumber: winnersRounds + i + 1,
      phase: 'losers',
      name: `Verliererrunde ${i + 1}`,
    });
  }

  // Grand finals round
  const grandFinalsRound: BracketRound = {
    id: nanoid(),
    roundNumber: winnersRounds + losersRoundCount + 1,
    phase: 'finals',
    name: 'Großes Finale',
  };
  rounds.push(grandFinalsRound);

  // Reset match round
  const resetRound: BracketRound = {
    id: nanoid(),
    roundNumber: winnersRounds + losersRoundCount + 2,
    phase: 'finals',
    name: 'Entscheidungsspiel',
  };
  rounds.push(resetRound);

  // Create winners bracket matches
  const winnersRoundRefs = rounds.filter(r => r.phase === 'winners');
  for (let r = 0; r < winnersRounds; r++) {
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
        roundId: winnersRoundRefs[r].id,
        groupId: null,
      });
    }

    allWinnersMatches.push(roundMatches);
  }

  // Link winners bracket matches
  for (let r = 0; r < winnersRounds - 1; r++) {
    for (let m = 0; m < allWinnersMatches[r].length; m++) {
      const nextMatchIndex = Math.floor(m / 2);
      allWinnersMatches[r][m].nextMatchId = allWinnersMatches[r + 1][nextMatchIndex].id;
    }
  }

  // Create losers bracket matches
  // Pattern: odd losers rounds receive drop-downs from winners, even rounds are internal
  const losersRoundRefs = rounds.filter(r => r.phase === 'losers');
  let prevLosersCount = bracketSize / 2; // First losers round has bracketSize/4 matches (pairs of losers)

  for (let lr = 0; lr < losersRoundCount; lr++) {
    let matchCount: number;
    if (lr === 0) {
      matchCount = bracketSize / 4; // First losers round
    } else if (lr % 2 === 1) {
      // Odd losers round: same count as previous (drop-down round)
      matchCount = prevLosersCount;
    } else {
      // Even losers round: halved
      matchCount = Math.max(1, prevLosersCount / 2);
      prevLosersCount = matchCount;
    }

    // Ensure at least 1 match
    matchCount = Math.max(1, Math.floor(matchCount));

    const roundMatches: BracketMatch[] = [];
    for (let m = 0; m < matchCount; m++) {
      roundMatches.push({
        id: nanoid(),
        matchNumber: 0,
        scheduledRound: null,
        team1Id: null,
        team2Id: null,
        isBye: false,
        bracketPosition: `L-R${lr + 1}-M${m + 1}`,
        nextMatchId: null,
        loserNextMatchId: null,
        roundId: losersRoundRefs[lr].id,
        groupId: null,
      });
    }

    allLosersMatches.push(roundMatches);
  }

  // Link losers bracket matches to each other
  for (let lr = 0; lr < losersRoundCount - 1; lr++) {
    for (let m = 0; m < allLosersMatches[lr].length; m++) {
      if (lr % 2 === 0 && allLosersMatches[lr + 1]) {
        // Internal round -> next losers round (same index)
        const nextIdx = Math.min(m, allLosersMatches[lr + 1].length - 1);
        allLosersMatches[lr][m].nextMatchId = allLosersMatches[lr + 1][nextIdx].id;
      } else if (allLosersMatches[lr + 1]) {
        // Drop-down round -> next losers round (halved)
        const nextIdx = Math.min(Math.floor(m / 2), allLosersMatches[lr + 1].length - 1);
        allLosersMatches[lr][m].nextMatchId = allLosersMatches[lr + 1][nextIdx].id;
      }
    }
  }

  // Link winners bracket losers to losers bracket
  // WR1 losers -> LR1 (first losers round)
  if (allWinnersMatches[0] && allLosersMatches[0]) {
    for (let m = 0; m < allWinnersMatches[0].length; m++) {
      const losersIdx = Math.min(Math.floor(m / 2), allLosersMatches[0].length - 1);
      allWinnersMatches[0][m].loserNextMatchId = allLosersMatches[0][losersIdx].id;
    }
  }

  // WR2+ losers -> appropriate losers round (odd losers rounds receive drop-downs)
  for (let wr = 1; wr < winnersRounds; wr++) {
    const losersRoundIdx = 2 * wr - 1; // WR2 -> LR2(idx1), WR3 -> LR4(idx3), etc.
    if (losersRoundIdx < allLosersMatches.length) {
      for (let m = 0; m < allWinnersMatches[wr].length; m++) {
        const losersIdx = Math.min(m, allLosersMatches[losersRoundIdx].length - 1);
        allWinnersMatches[wr][m].loserNextMatchId = allLosersMatches[losersRoundIdx][losersIdx].id;
      }
    }
  }

  // Grand finals match
  const grandFinalsMatch: BracketMatch = {
    id: nanoid(),
    matchNumber: 0,
    scheduledRound: null,
    team1Id: null,
    team2Id: null,
    isBye: false,
    bracketPosition: 'GF-M1',
    nextMatchId: null,
    loserNextMatchId: null,
    roundId: grandFinalsRound.id,
    groupId: null,
  };

  // Reset match
  const resetMatch: BracketMatch = {
    id: nanoid(),
    matchNumber: 0,
    scheduledRound: null,
    team1Id: null,
    team2Id: null,
    isBye: false,
    bracketPosition: 'GF-M2',
    nextMatchId: null,
    loserNextMatchId: null,
    roundId: resetRound.id,
    groupId: null,
  };

  grandFinalsMatch.nextMatchId = resetMatch.id;

  // Winners bracket final -> grand finals
  const winnersLast = allWinnersMatches[winnersRounds - 1];
  if (winnersLast && winnersLast[0]) {
    winnersLast[0].nextMatchId = grandFinalsMatch.id;
  }

  // Losers bracket final -> grand finals
  const losersLast = allLosersMatches[allLosersMatches.length - 1];
  if (losersLast && losersLast[0]) {
    losersLast[0].nextMatchId = grandFinalsMatch.id;
  }

  // Seed teams into first winners round
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  const seedOrder = generateSeedOrder(bracketSize);

  for (let i = 0; i < bracketSize; i++) {
    const seedPos = seedOrder[i];
    const team = seedPos <= sortedTeams.length ? sortedTeams[seedPos - 1] : null;

    const matchIndex = Math.floor(i / 2);
    const match = allWinnersMatches[0][matchIndex];

    if (i % 2 === 0) {
      match.team1Id = team?.id || null;
    } else {
      match.team2Id = team?.id || null;
    }
  }

  // Handle byes in first round
  for (const match of allWinnersMatches[0]) {
    if ((match.team1Id && !match.team2Id) || (!match.team1Id && match.team2Id)) {
      match.isBye = true;
    }
  }

  const flatMatches = [
    ...allWinnersMatches.flat(),
    ...allLosersMatches.flat(),
    grandFinalsMatch,
    resetMatch,
  ];

  return { rounds, matches: flatMatches };
}

import { nanoid } from 'nanoid';
import type { GeneratedBracket, TeamSeed, BracketMatch, BracketRound } from './types';

function getRoundName(roundsTotal: number, roundIndex: number): string {
  const remaining = roundsTotal - roundIndex;
  if (remaining === 1) return 'Finale';
  if (remaining === 2) return 'Halbfinale';
  if (remaining === 3) return 'Viertelfinale';
  if (remaining === 4) return 'Achtelfinale';
  return `Runde ${roundIndex + 1}`;
}

/** Fisher-Yates shuffle for random team order */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateSingleEliminationBracket(
  eventId: number,
  teams: TeamSeed[]
): GeneratedBracket {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams');
  }

  const shuffled = shuffle(teams);
  const n = shuffled.length;

  // Compute how many teams enter each round
  const teamsPerRound: number[] = [];
  let remaining = n;
  while (remaining > 1) {
    teamsPerRound.push(remaining);
    remaining = Math.ceil(remaining / 2);
  }
  const totalRounds = teamsPerRound.length;

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

  // Create matches for each round.
  // Real matches come first, bye match (if any) is last in the array.
  const allMatches: BracketMatch[][] = [];

  for (let r = 0; r < totalRounds; r++) {
    const teamCount = teamsPerRound[r];
    const matchCount = Math.floor(teamCount / 2);
    const hasBye = teamCount % 2 === 1;

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
      });
    }

    if (hasBye) {
      roundMatches.push({
        id: nanoid(),
        matchNumber: 0,
        scheduledRound: null,
        team1Id: null,
        team2Id: null,
        isBye: true,
        bracketPosition: `W-R${r + 1}-BYE`,
        nextMatchId: null,
        loserNextMatchId: null,
        roundId: rounds[r].id,
      });
    }

    allMatches.push(roundMatches);
  }

  // Link matches across rounds.
  //
  // When a round has a bye, use interleaving so the bye team PLAYS in the
  // next round instead of getting repeated byes:
  //   Advancing order: [w(M0), bye_team, w(M1), w(M2), …, w(M_last)]
  //   - M0   → next_match[0]        (slot 1)
  //   - bye  → next_match[0]        (slot 2, plays against M0 winner)
  //   - M_m (m≥1) → next_match[⌊(m+1)/2⌋]
  //   - Last match winner may land in the next round's bye slot
  //
  // Without a bye, standard pairing: M_m → next_match[⌊m/2⌋]

  for (let r = 0; r < totalRounds - 1; r++) {
    const teamCount = teamsPerRound[r];
    const matchCount = Math.floor(teamCount / 2);
    const hasBye = teamCount % 2 === 1;
    const nextRound = allMatches[r + 1];

    if (hasBye) {
      // M0 and bye both feed into the first match of next round
      allMatches[r][0].nextMatchId = nextRound[0].id;
      allMatches[r][matchCount].nextMatchId = nextRound[0].id; // bye match

      for (let m = 1; m < matchCount; m++) {
        const nextIdx = Math.floor((m + 1) / 2);
        allMatches[r][m].nextMatchId = nextRound[nextIdx].id;
      }
    } else {
      for (let m = 0; m < matchCount; m++) {
        allMatches[r][m].nextMatchId = nextRound[Math.floor(m / 2)].id;
      }
    }
  }

  // Assign shuffled teams to first round
  const firstRoundMatchCount = Math.floor(n / 2);

  for (let m = 0; m < firstRoundMatchCount; m++) {
    allMatches[0][m].team1Id = shuffled[m * 2].id;
    allMatches[0][m].team2Id = shuffled[m * 2 + 1].id;
  }

  // Odd team count → last team gets the first-round bye
  if (n % 2 === 1) {
    allMatches[0][firstRoundMatchCount].team1Id = shuffled[n - 1].id;
  }

  return { rounds, matches: allMatches.flat() };
}

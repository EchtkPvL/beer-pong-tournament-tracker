import { nanoid } from 'nanoid';
import type { GeneratedBracket, TeamSeed, BracketMatch, BracketRound } from './types';

/**
 * Serpentine seeding: distributes teams across groups fairly
 * Group 1: seed 1, 4, 5, 8, ...
 * Group 2: seed 2, 3, 6, 7, ...
 */
function serpentineSeed(teams: TeamSeed[], groupCount: number): TeamSeed[][] {
  const groups: TeamSeed[][] = Array.from({ length: groupCount }, () => []);
  const sorted = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));

  let direction = 1;
  let groupIdx = 0;

  for (const team of sorted) {
    groups[groupIdx].push(team);

    if (direction === 1 && groupIdx === groupCount - 1) {
      direction = -1;
    } else if (direction === -1 && groupIdx === 0) {
      direction = 1;
    } else {
      groupIdx += direction;
    }
  }

  return groups;
}

/**
 * Generate round-robin schedule for a group
 * Handles odd team count with a bye each round
 */
function generateRoundRobin(teamIds: string[]): [string | null, string | null][] {
  const teams = [...teamIds];
  // If odd number, add a "bye" placeholder
  if (teams.length % 2 !== 0) {
    teams.push('__BYE__');
  }

  const n = teams.length;
  const rounds: [string | null, string | null][][] = [];

  // Round-robin algorithm: fix first team, rotate rest
  for (let round = 0; round < n - 1; round++) {
    const roundMatches: [string | null, string | null][] = [];

    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];

      const team1 = home === '__BYE__' ? null : home;
      const team2 = away === '__BYE__' ? null : away;

      roundMatches.push([team1, team2]);
    }

    rounds.push(roundMatches);

    // Rotate: keep first element, rotate rest
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }

  return rounds.flat();
}

function groupLetter(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C, ...
}

export function generateGroupPhase(
  eventId: number,
  teams: TeamSeed[],
  groupCount: number
): GeneratedBracket {
  if (teams.length < groupCount * 2) {
    throw new Error(`Need at least ${groupCount * 2} teams for ${groupCount} groups`);
  }

  const groups = serpentineSeed(teams, groupCount);
  const rounds: BracketRound[] = [];
  const matches: BracketMatch[] = [];

  // Find the maximum number of rounds needed across all groups
  let maxRounds = 0;
  for (const group of groups) {
    const groupSize = group.length;
    const roundCount = groupSize % 2 === 0 ? groupSize - 1 : groupSize;
    maxRounds = Math.max(maxRounds, roundCount);
  }

  // Create rounds
  for (let r = 0; r < maxRounds; r++) {
    rounds.push({
      id: nanoid(),
      roundNumber: r + 1,
      phase: 'group',
      name: `Runde ${r + 1}`,
    });
  }

  // Generate matches for each group
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const groupId = `group-${groupLetter(g)}`;
    const teamIds = group.map(t => t.id);
    const rrMatches = generateRoundRobin(teamIds);

    // Distribute matches across rounds
    const teamsInGroup = teamIds.length;
    const actualMatchesPerRound = Math.ceil(teamsInGroup / 2);

    let roundIdx = 0;
    let matchInRound = 0;

    for (const [team1Id, team2Id] of rrMatches) {
      if (matchInRound >= actualMatchesPerRound) {
        roundIdx++;
        matchInRound = 0;
      }

      const isBye = !team1Id || !team2Id;
      const roundId = rounds[Math.min(roundIdx, rounds.length - 1)].id;

      matches.push({
        id: nanoid(),
        matchNumber: 0,
        scheduledRound: null,
        team1Id: team1Id,
        team2Id: team2Id,
        isBye,
        bracketPosition: `G${groupLetter(g)}-R${roundIdx + 1}-M${matchInRound + 1}`,
        nextMatchId: null,
        loserNextMatchId: null,
        roundId,
        groupId,
      });

      matchInRound++;
    }
  }

  return { rounds, matches };
}

export { serpentineSeed, groupLetter };

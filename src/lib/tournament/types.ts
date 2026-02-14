export interface BracketMatch {
  id: string;
  matchNumber: number;
  scheduledRound: number | null;
  team1Id: string | null;
  team2Id: string | null;
  isBye: boolean;
  bracketPosition: string;
  nextMatchId: string | null;
  loserNextMatchId: string | null;
  roundId: string;
  groupId: string | null;
}

export interface BracketRound {
  id: string;
  roundNumber: number;
  phase: 'group' | 'winners' | 'losers' | 'finals';
  name: string;
}

export interface GeneratedBracket {
  rounds: BracketRound[];
  matches: BracketMatch[];
}

export interface TeamSeed {
  id: string;
  seed: number;
  name: string;
}

export interface GroupStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  points: number;
}

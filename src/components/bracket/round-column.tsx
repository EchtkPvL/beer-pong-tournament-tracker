'use client';

import { cn } from '@/lib/utils';
import type { Match, Round, Team } from '@/lib/db/schema';
import { MatchCard } from './match-card';

interface RoundColumnProps {
  round: Round;
  matches: Match[];
  teams: Record<string, Team>;
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

export function RoundColumn({
  round,
  matches,
  teams,
  onMatchClick,
  isAdmin,
}: RoundColumnProps) {
  const sortedMatches = [...matches].sort(
    (a, b) => a.matchNumber - b.matchNumber
  );

  return (
    <div className="flex shrink-0 flex-col items-center">
      {/* Round header */}
      <div className="mb-4 text-center">
        <h3 className="text-sm font-semibold text-foreground">{round.name}</h3>
      </div>

      {/* Match cards */}
      <div className="flex flex-1 flex-col justify-around gap-4">
        {sortedMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            teams={teams}
            onClick={onMatchClick}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';

import type { Match, Round, Team } from '@/lib/db/schema';
import { SingleElimBracket } from './single-elim-bracket';
import { DoubleElimBracket } from './double-elim-bracket';

interface BracketViewProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  mode: 'single_elimination' | 'double_elimination';
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
  visiblePhase?: 'winners' | 'losers' | 'finals';
}

export function BracketView({
  matches,
  rounds,
  teams,
  mode,
  onMatchClick,
  isAdmin,
  visiblePhase,
}: BracketViewProps) {
  const content = useMemo(() => {
    switch (mode) {
      case 'single_elimination':
        return (
          <SingleElimBracket
            matches={matches}
            rounds={rounds}
            teams={teams}
            onMatchClick={onMatchClick}
            isAdmin={isAdmin}
          />
        );
      case 'double_elimination':
        return (
          <DoubleElimBracket
            matches={matches}
            rounds={rounds}
            teams={teams}
            onMatchClick={onMatchClick}
            isAdmin={isAdmin}
            visiblePhase={visiblePhase}
          />
        );
      default:
        return null;
    }
  }, [mode, matches, rounds, teams, onMatchClick, isAdmin, visiblePhase]);

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-max p-4">
        {content}
      </div>
    </div>
  );
}

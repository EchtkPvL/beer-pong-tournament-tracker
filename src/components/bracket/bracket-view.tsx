'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Match, Round, Team } from '@/lib/db/schema';
import { SingleElimBracket } from './single-elim-bracket';
import { DoubleElimBracket } from './double-elim-bracket';
import { GroupPhaseView } from './group-phase-view';

interface BracketViewProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  mode: 'single_elimination' | 'double_elimination' | 'group';
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

export function BracketView({
  matches,
  rounds,
  teams,
  mode,
  onMatchClick,
  isAdmin,
}: BracketViewProps) {
  const t = useTranslations('bracket');

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
          />
        );
      case 'group':
        return (
          <GroupPhaseView
            matches={matches}
            rounds={rounds}
            teams={teams}
            onMatchClick={onMatchClick}
            isAdmin={isAdmin}
          />
        );
      default:
        return null;
    }
  }, [mode, matches, rounds, teams, onMatchClick, isAdmin]);

  return (
    <div
      className={cn(
        'w-full',
        // Horizontal scroll for bracket modes on mobile
        mode !== 'group' && 'overflow-x-auto'
      )}
    >
      <div className={cn(mode !== 'group' && 'min-w-max p-4')}>
        {content}
      </div>
    </div>
  );
}

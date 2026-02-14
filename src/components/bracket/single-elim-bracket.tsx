'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Match, Round, Team } from '@/lib/db/schema';
import { RoundColumn } from './round-column';
import { BracketConnector } from './bracket-connector';

interface SingleElimBracketProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

export function SingleElimBracket({
  matches,
  rounds,
  teams,
  onMatchClick,
  isAdmin,
}: SingleElimBracketProps) {
  const t = useTranslations('bracket');

  // Build a lookup of teams by id
  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    for (const team of teams) {
      map[team.id] = team;
    }
    return map;
  }, [teams]);

  // Sort rounds by round number
  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const match of matches) {
      if (!map[match.roundId]) {
        map[match.roundId] = [];
      }
      map[match.roundId].push(match);
    }
    return map;
  }, [matches]);

  if (sortedRounds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('noBracket')}
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-0">
      {sortedRounds.map((round, index) => {
        const roundMatches = matchesByRound[round.id] ?? [];
        const nextRound = sortedRounds[index + 1];
        const nextRoundMatches = nextRound
          ? (matchesByRound[nextRound.id] ?? [])
          : [];

        return (
          <div key={round.id} className="flex items-stretch">
            <RoundColumn
              round={round}
              matches={roundMatches}
              teams={teamsMap}
              onMatchClick={onMatchClick}
              isAdmin={isAdmin}
            />
            {/* Connector lines between rounds */}
            {index < sortedRounds.length - 1 && (
              <BracketConnector matchCount={roundMatches.length} />
            )}
          </div>
        );
      })}
    </div>
  );
}

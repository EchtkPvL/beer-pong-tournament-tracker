'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { Match, Round, Team } from '@/lib/db/schema';
import { buildMatchTree, MatchTreeView } from './match-tree';
import { translateRoundName } from '@/lib/tournament/round-names';

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
  const tRounds = useTranslations('rounds');

  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    for (const team of teams) {
      map[team.id] = team;
    }
    return map;
  }, [teams]);

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  const translatedRounds = useMemo(() =>
    sortedRounds.map(r => ({ ...r, name: translateRoundName(r, rounds, tRounds) })),
    [sortedRounds, rounds, tRounds]
  );

  // Find the final match (no nextMatchId)
  const tree = useMemo(() => {
    const finalMatch = matches.find((m) => !m.nextMatchId);
    if (!finalMatch) return null;
    return buildMatchTree(matches, finalMatch.id);
  }, [matches]);

  if (sortedRounds.length === 0 || !tree) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('noBracket')}
      </div>
    );
  }

  return (
    <MatchTreeView
      allMatches={matches}
      root={tree}
      rounds={translatedRounds}
      teams={teamsMap}
      onMatchClick={onMatchClick}
      isAdmin={isAdmin}
    />
  );
}

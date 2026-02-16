'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { Match, Round, Team } from '@/lib/db/schema';
import { buildMatchTree, MatchTreeView } from './match-tree';
import { translateRoundName } from '@/lib/tournament/round-names';

interface DoubleElimBracketProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
  visiblePhase?: 'winners' | 'losers' | 'finals';
}

export function DoubleElimBracket({
  matches,
  rounds,
  teams,
  onMatchClick,
  isAdmin,
  visiblePhase,
}: DoubleElimBracketProps) {
  const t = useTranslations('bracket');
  const tRounds = useTranslations('rounds');

  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    for (const team of teams) {
      map[team.id] = team;
    }
    return map;
  }, [teams]);

  // Separate rounds by phase
  const { winnersRounds, losersRounds, finalsRounds } = useMemo(() => {
    const winners: Round[] = [];
    const losers: Round[] = [];
    const finals: Round[] = [];

    for (const round of rounds) {
      if (round.phase === 'winners') {
        winners.push(round);
      } else if (round.phase === 'losers') {
        losers.push(round);
      } else if (round.phase === 'finals') {
        finals.push(round);
      }
    }

    winners.sort((a, b) => a.roundNumber - b.roundNumber);
    losers.sort((a, b) => a.roundNumber - b.roundNumber);
    finals.sort((a, b) => a.roundNumber - b.roundNumber);

    return { winnersRounds: winners, losersRounds: losers, finalsRounds: finals };
  }, [rounds]);

  // Translate round names
  const trWinnersRounds = useMemo(() =>
    winnersRounds.map(r => ({ ...r, name: translateRoundName(r, rounds, tRounds) })),
    [winnersRounds, rounds, tRounds]
  );
  const trLosersRounds = useMemo(() =>
    losersRounds.map(r => ({ ...r, name: translateRoundName(r, rounds, tRounds) })),
    [losersRounds, rounds, tRounds]
  );
  const trFinalsRounds = useMemo(() =>
    finalsRounds.map(r => ({ ...r, name: translateRoundName(r, rounds, tRounds) })),
    [finalsRounds, rounds, tRounds]
  );

  // Build a set of round IDs per phase for fast lookup
  const roundPhase = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rounds) {
      map.set(r.id, r.phase);
    }
    return map;
  }, [rounds]);

  // Partition matches by phase
  const { winnersMatches, losersMatches, finalsMatches } = useMemo(() => {
    const winners: Match[] = [];
    const losers: Match[] = [];
    const finals: Match[] = [];

    for (const m of matches) {
      const phase = roundPhase.get(m.roundId);
      if (phase === 'winners') winners.push(m);
      else if (phase === 'losers') losers.push(m);
      else if (phase === 'finals') finals.push(m);
    }

    return { winnersMatches: winners, losersMatches: losers, finalsMatches: finals };
  }, [matches, roundPhase]);

  /**
   * Find the root match of a section: the match whose nextMatchId is null
   * or points to a match outside this section.
   */
  const findSectionRoot = (sectionMatches: Match[]): Match | undefined => {
    const ids = new Set(sectionMatches.map((m) => m.id));
    return sectionMatches.find(
      (m) => !m.nextMatchId || !ids.has(m.nextMatchId)
    );
  };

  const winnersTree = useMemo(() => {
    const root = findSectionRoot(winnersMatches);
    if (!root) return null;
    return buildMatchTree(winnersMatches, root.id);
  }, [winnersMatches]);

  const losersTree = useMemo(() => {
    const root = findSectionRoot(losersMatches);
    if (!root) return null;
    return buildMatchTree(losersMatches, root.id);
  }, [losersMatches]);

  const finalsTree = useMemo(() => {
    const root = findSectionRoot(finalsMatches);
    if (!root) return null;
    return buildMatchTree(finalsMatches, root.id);
  }, [finalsMatches]);

  if (rounds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('noBracket')}
      </div>
    );
  }

  const showWinners = winnersTree && (!visiblePhase || visiblePhase === 'winners');
  const showLosers = losersTree && (!visiblePhase || visiblePhase === 'losers');
  const showFinals = finalsTree && (!visiblePhase || visiblePhase === 'finals');

  return (
    <div className="flex flex-col gap-8">
      {/* Winners Bracket */}
      {showWinners && (
        <div>
          {!visiblePhase && (
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('winnersBracket')}
            </h3>
          )}
          <MatchTreeView
            allMatches={matches}
            root={winnersTree}
            rounds={trWinnersRounds}
            teams={teamsMap}
            onMatchClick={onMatchClick}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Divider */}
      {!visiblePhase && winnersTree && losersTree && (
        <div className="border-t-2 border-dashed border-border" />
      )}

      {/* Losers Bracket */}
      {showLosers && (
        <div>
          {!visiblePhase && (
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('losersBracket')}
            </h3>
          )}
          <MatchTreeView
            allMatches={matches}
            root={losersTree}
            rounds={trLosersRounds}
            teams={teamsMap}
            onMatchClick={onMatchClick}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Grand Finals */}
      {showFinals && (
        <>
          {!visiblePhase && (
            <div className="border-t-2 border-dashed border-border" />
          )}
          <div>
            {!visiblePhase && (
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('grandFinals')}
              </h3>
            )}
            <MatchTreeView
              allMatches={matches}
              root={finalsTree}
              rounds={trFinalsRounds}
              teams={teamsMap}
              onMatchClick={onMatchClick}
              isAdmin={isAdmin}
            />
          </div>
        </>
      )}
    </div>
  );
}

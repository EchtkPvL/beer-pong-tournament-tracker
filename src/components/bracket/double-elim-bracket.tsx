'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { Match, Round, Team } from '@/lib/db/schema';
import { RoundColumn } from './round-column';
import { BracketConnector } from './bracket-connector';

interface DoubleElimBracketProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

export function DoubleElimBracket({
  matches,
  rounds,
  teams,
  onMatchClick,
  isAdmin,
}: DoubleElimBracketProps) {
  const t = useTranslations('bracket');

  // Build a lookup of teams by id
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

  if (rounds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('noBracket')}
      </div>
    );
  }

  const renderBracketSection = (
    sectionRounds: Round[],
    label: string
  ) => {
    const visible = sectionRounds.filter(
      (r) => (matchesByRound[r.id] ?? []).length > 0
    );
    if (visible.length === 0) return null;

    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <div className="flex items-stretch gap-0">
          {visible.map((round, index) => {
            const roundMatches = matchesByRound[round.id] ?? [];

            return (
              <div key={round.id} className="flex items-stretch">
                <RoundColumn
                  round={round}
                  matches={roundMatches}
                  allMatches={matches}
                  teams={teamsMap}
                  onMatchClick={onMatchClick}
                  isAdmin={isAdmin}
                />
                {index < visible.length - 1 && (
                  <BracketConnector matchCount={roundMatches.length} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Winners Bracket */}
      {winnersRounds.length > 0 &&
        renderBracketSection(winnersRounds, t('winnersBracket'))}

      {/* Divider */}
      {winnersRounds.length > 0 && losersRounds.length > 0 && (
        <div className="border-t-2 border-dashed border-border" />
      )}

      {/* Losers Bracket */}
      {losersRounds.length > 0 &&
        renderBracketSection(losersRounds, t('losersBracket'))}

      {/* Grand Finals */}
      {finalsRounds.length > 0 && (
        <>
          <div className="border-t-2 border-dashed border-border" />
          {renderBracketSection(finalsRounds, t('grandFinals'))}
        </>
      )}
    </div>
  );
}

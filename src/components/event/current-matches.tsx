'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Match, Team } from '@/lib/db/schema';

interface CurrentMatchesProps {
  matches: Match[];
  teams: Team[];
}

function getTeamName(teams: Team[], teamId: string | null): string {
  if (!teamId) return 'TBD';
  const team = teams.find((t) => t.id === teamId);
  return team?.name ?? 'TBD';
}

function isTeamDisqualified(teams: Team[], teamId: string | null): boolean {
  if (!teamId) return false;
  const team = teams.find((t) => t.id === teamId);
  return team?.status === 'disqualified';
}

export function CurrentMatches({ matches, teams }: CurrentMatchesProps) {
  const t = useTranslations('matches');
  const tBracket = useTranslations('bracket');
  const tBeamer = useTranslations('beamer');

  const { currentRound, currentMatches, upcomingByRound, completedByRound } = useMemo(() => {
    // Playable matches: non-bye, with both teams, with a scheduled round
    const playable = matches.filter(
      (m) => !m.isBye && m.team1Id && m.team2Id && m.scheduledRound != null && m.scheduledRound > 0
    );

    // Current round = lowest scheduledRound with at least one non-completed match
    const incompleteRounds = playable
      .filter((m) => m.status !== 'completed')
      .map((m) => m.scheduledRound!);
    const cr = incompleteRounds.length > 0 ? Math.min(...incompleteRounds) : null;

    // Current matches: all non-completed matches from the current round
    const current = cr != null
      ? playable.filter(
          (m) => m.scheduledRound === cr && m.status !== 'completed'
        ).sort((a, b) => a.matchNumber - b.matchNumber)
      : [];

    // Upcoming: non-completed matches from rounds after current
    const upcoming = playable
      .filter(
        (m) =>
          m.status !== 'completed' &&
          (cr == null || m.scheduledRound! > cr)
      )
      .sort(
        (a, b) =>
          (a.scheduledRound ?? 0) - (b.scheduledRound ?? 0) ||
          a.matchNumber - b.matchNumber
      );

    const completed = matches
      .filter((m) => m.status === 'completed' && !m.isBye)
      .sort(
        (a, b) =>
          (a.scheduledRound ?? 0) - (b.scheduledRound ?? 0) ||
          a.matchNumber - b.matchNumber
      );

    // Group upcoming by playing round
    const ubr = new Map<number, Match[]>();
    for (const m of upcoming) {
      const sr = m.scheduledRound ?? 0;
      if (!ubr.has(sr)) ubr.set(sr, []);
      ubr.get(sr)!.push(m);
    }

    // Group completed by playing round
    const cbr = new Map<number, Match[]>();
    for (const m of completed) {
      const sr = m.scheduledRound ?? 0;
      if (!cbr.has(sr)) cbr.set(sr, []);
      cbr.get(sr)!.push(m);
    }

    return {
      currentRound: cr,
      currentMatches: current,
      upcomingByRound: ubr,
      completedByRound: cbr,
    };
  }, [matches]);

  return (
    <div className="space-y-6">
      {currentRound != null && currentRound > 0 && (
        <div className="rounded-lg bg-primary/10 px-4 py-3 text-center">
          <span className="text-lg font-bold text-primary">
            {tBracket('currentRound', { number: currentRound })}
          </span>
        </div>
      )}

      {/* Current Matches */}
      <section>
        <h3 className="mb-3 text-lg font-semibold">
          {tBeamer('currentMatches')}
        </h3>
        {currentMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tBeamer('noCurrentMatches')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {currentMatches.map((match) => (
              <Card key={match.id} className="border-primary/30">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      #{match.matchNumber}
                    </span>
                    <span className={cn("font-medium", isTeamDisqualified(teams, match.team1Id) && "line-through opacity-60")}>
                      {getTeamName(teams, match.team1Id)}
                    </span>
                    <span className="text-muted-foreground">{t('vs')}</span>
                    <span className={cn("font-medium", isTeamDisqualified(teams, match.team2Id) && "line-through opacity-60")}>
                      {getTeamName(teams, match.team2Id)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.team1Score !== null && match.team2Score !== null && (
                      <span className="font-mono tabular-nums">
                        {match.team1Score} : {match.team2Score}
                      </span>
                    )}
                    {match.tableNumber !== null && (
                      <Badge variant="outline">
                        {tBracket('table', { number: match.tableNumber })}
                      </Badge>
                    )}
                    <Badge>
                      {match.status === 'in_progress' ? t('inProgress') : t('pending')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming grouped by playing round */}
      <section>
        <h3 className="mb-3 text-lg font-semibold">
          {tBeamer('nextMatches')}
        </h3>
        {upcomingByRound.size === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noMatches')}</p>
        ) : (
          <div className="space-y-4">
            {[...upcomingByRound.entries()].slice(0, 4).map(([sr, roundMatches]) => (
              <div key={sr}>
                {sr > 0 && (
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {tBracket('playingRound', { number: sr })}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {roundMatches.length} {t('concurrent', { count: roundMatches.length })}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {roundMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          #{match.matchNumber}
                        </span>
                        <span className={cn("font-medium", isTeamDisqualified(teams, match.team1Id) && "line-through opacity-60")}>
                          {getTeamName(teams, match.team1Id)}
                        </span>
                        <span className="text-muted-foreground">{t('vs')}</span>
                        <span className={cn("font-medium", isTeamDisqualified(teams, match.team2Id) && "line-through opacity-60")}>
                          {getTeamName(teams, match.team2Id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.tableNumber !== null && (
                          <Badge variant="outline">
                            {tBracket('table', { number: match.tableNumber })}
                          </Badge>
                        )}
                        <Badge variant="outline">{t('pending')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed grouped by playing round */}
      {completedByRound.size > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold">{t('completed')}</h3>
          <div className="space-y-4">
            {[...completedByRound.entries()].map(([sr, roundMatches]) => (
              <div key={sr}>
                {sr > 0 && (
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {tBracket('playingRound', { number: sr })}
                    </Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {roundMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between rounded-lg border p-3 opacity-75"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          #{match.matchNumber}
                        </span>
                        <span className={cn("font-medium", isTeamDisqualified(teams, match.team1Id) && "line-through opacity-60")}>
                          {getTeamName(teams, match.team1Id)}
                        </span>
                        <span className="text-muted-foreground">{t('vs')}</span>
                        <span className={cn("font-medium", isTeamDisqualified(teams, match.team2Id) && "line-through opacity-60")}>
                          {getTeamName(teams, match.team2Id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.team1Score !== null &&
                          match.team2Score !== null && (
                            <Badge variant="default">
                              {match.team1Score} : {match.team2Score}
                            </Badge>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

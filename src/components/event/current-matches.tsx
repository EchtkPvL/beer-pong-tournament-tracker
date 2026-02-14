'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

export function CurrentMatches({ matches, teams }: CurrentMatchesProps) {
  const t = useTranslations('matches');
  const tBracket = useTranslations('bracket');
  const tBeamer = useTranslations('beamer');

  const { inProgress, upcomingByRound, completedByRound } = useMemo(() => {
    const ip = matches.filter((m) => m.status === 'in_progress' && !m.isBye);
    const upcoming = matches
      .filter(
        (m) =>
          (m.status === 'pending' || m.status === 'scheduled') &&
          m.team1Id !== null &&
          m.team2Id !== null &&
          !m.isBye
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
      inProgress: ip,
      upcomingByRound: ubr,
      completedByRound: cbr,
    };
  }, [matches]);

  // Determine the current playing round
  const currentRound =
    inProgress.length > 0
      ? inProgress[0].scheduledRound
      : upcomingByRound.size > 0
        ? [...upcomingByRound.keys()][0]
        : null;

  return (
    <div className="space-y-6">
      {currentRound != null && currentRound > 0 && (
        <div className="rounded-lg bg-primary/10 px-4 py-3 text-center">
          <span className="text-lg font-bold text-primary">
            {tBracket('currentRound', { number: currentRound })}
          </span>
        </div>
      )}

      {/* In Progress */}
      <section>
        <h3 className="mb-3 text-lg font-semibold">
          {tBeamer('currentMatches')}
        </h3>
        {inProgress.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tBeamer('noCurrentMatches')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {inProgress.map((match) => (
              <Card key={match.id} className="border-primary/30">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      #{match.matchNumber}
                    </span>
                    <span className="font-medium">
                      {getTeamName(teams, match.team1Id)}
                    </span>
                    <span className="text-muted-foreground">{t('vs')}</span>
                    <span className="font-medium">
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
                    <Badge>{t('inProgress')}</Badge>
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
                        <span className="font-medium">
                          {getTeamName(teams, match.team1Id)}
                        </span>
                        <span className="text-muted-foreground">{t('vs')}</span>
                        <span className="font-medium">
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
                        <span className="font-medium">
                          {getTeamName(teams, match.team1Id)}
                        </span>
                        <span className="text-muted-foreground">{t('vs')}</span>
                        <span className="font-medium">
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

'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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

  const inProgress = matches.filter((m) => m.status === 'in_progress');
  const upcoming = matches.filter(
    (m) =>
      (m.status === 'pending' || m.status === 'scheduled') &&
      m.team1Id !== null &&
      m.team2Id !== null &&
      !m.isBye
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-lg font-semibold">{tBeamer('currentMatches')}</h3>
        {inProgress.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tBeamer('noCurrentMatches')}
          </p>
        ) : (
          <ul className="space-y-2">
            {inProgress.map((match) => (
              <li
                key={match.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {getTeamName(teams, match.team1Id)}
                  </span>
                  <span className="text-muted-foreground">{t('vs')}</span>
                  <span className="font-medium">
                    {getTeamName(teams, match.team2Id)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">{tBeamer('nextMatches')}</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noMatches')}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 8).map((match) => (
              <li
                key={match.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {getTeamName(teams, match.team1Id)}
                  </span>
                  <span className="text-muted-foreground">{t('vs')}</span>
                  <span className="font-medium">
                    {getTeamName(teams, match.team2Id)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {match.tableNumber !== null && (
                    <Badge variant="outline">
                      {tBracket('table', { number: match.tableNumber })}
                    </Badge>
                  )}
                  <Badge variant="secondary">{t('pending')}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Match, Team } from '@/lib/db/schema';

interface TeamStandingsProps {
  matches: Match[];
  teams: Team[];
}

interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  disqualified: boolean;
}

export function TeamStandings({ matches, teams }: TeamStandingsProps) {
  const t = useTranslations('standings');

  const standings = useMemo(() => {
    const map = new Map<string, Standing>();

    for (const team of teams) {
      map.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDiff: 0,
        disqualified: team.status === 'disqualified',
      });
    }

    for (const match of matches) {
      if (match.status !== 'completed') continue;
      if (!match.team1Id || !match.team2Id || match.isBye) continue;

      const s1 = match.team1Score ?? 0;
      const s2 = match.team2Score ?? 0;

      const t1 = map.get(match.team1Id);
      const t2 = map.get(match.team2Id);

      if (t1) {
        t1.played++;
        t1.pointsFor += s1;
        t1.pointsAgainst += s2;
        if (match.winnerId === match.team1Id) t1.wins++;
        else t1.losses++;
      }

      if (t2) {
        t2.played++;
        t2.pointsFor += s2;
        t2.pointsAgainst += s1;
        if (match.winnerId === match.team2Id) t2.wins++;
        else t2.losses++;
      }
    }

    const result = Array.from(map.values()).map((s) => ({
      ...s,
      pointDiff: s.pointsFor - s.pointsAgainst,
    }));

    result.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      return b.pointsFor - a.pointsFor;
    });

    return result;
  }, [matches, teams]);

  if (standings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">{t('team')}</th>
                <th className="pb-2 pr-2 text-center font-medium">{t('played')}</th>
                <th className="pb-2 pr-2 text-center font-medium">{t('wins')}</th>
                <th className="pb-2 pr-2 text-center font-medium">{t('losses')}</th>
                <th className="pb-2 pr-2 text-center font-medium">{t('pointDiff')}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr
                  key={s.teamId}
                  className={`border-b border-border/50 last:border-0${s.disqualified ? ' opacity-60 line-through' : ''}`}
                >
                  <td className="py-1.5 pr-2 text-muted-foreground">{idx + 1}</td>
                  <td className="py-1.5 pr-2 truncate max-w-[200px] font-medium">
                    {s.teamName}
                  </td>
                  <td className="py-1.5 pr-2 text-center">{s.played}</td>
                  <td className="py-1.5 pr-2 text-center">{s.wins}</td>
                  <td className="py-1.5 pr-2 text-center">{s.losses}</td>
                  <td className="py-1.5 pr-2 text-center">
                    {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

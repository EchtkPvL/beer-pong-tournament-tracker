import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import type { Match, Team } from '@/lib/db/schema';

interface EventStatsProps {
  matches: Match[];
  teams: Team[];
}

export function EventStats({ matches, teams }: EventStatsProps) {
  const t = useTranslations('events');
  const tMatches = useTranslations('matches');

  const totalMatches = matches.filter((m) => !m.isBye).length;
  const completedMatches = matches.filter(
    (m) => m.status === 'completed' && !m.isBye
  ).length;
  const remainingMatches = totalMatches - completedMatches;
  const activeTeams = teams.filter((t) => t.status === 'active').length;

  const stats = [
    {
      label: tMatches('current'),
      value: totalMatches,
    },
    {
      label: tMatches('completed'),
      value: completedMatches,
    },
    {
      label: tMatches('upcoming'),
      value: remainingMatches,
    },
    {
      label: t('teamCount', { count: activeTeams }),
      value: activeTeams,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

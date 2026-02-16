import { getTranslations } from 'next-intl/server';
import type { Match, Round, Team } from '@/lib/db/schema';
import { getPodium } from '@/lib/tournament/podium';

interface PodiumServerProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
}

export async function PodiumServer({ matches, rounds, teams }: PodiumServerProps) {
  const t = await getTranslations('podium');

  const teamMap = new Map(teams.map(tm => [tm.id, tm]));
  const entries = getPodium(matches, rounds)
    .map(p => ({ ...p, team: teamMap.get(p.teamId) }))
    .filter(p => p.team);

  if (entries.length === 0) return null;

  const placeLabels: Record<number, string> = {
    1: t('first'),
    2: t('second'),
    3: t('third'),
  };

  return (
    <div className="flex flex-wrap items-end justify-center gap-4">
      {entries.map((entry) => (
        <div
          key={entry.teamId}
          className={
            'flex flex-col items-center rounded-lg border p-4 text-center ' +
            (entry.place === 1
              ? 'order-1 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 min-w-[10rem]'
              : entry.place === 2
                ? 'order-2 border-gray-300 bg-gray-50 dark:bg-gray-900/30 min-w-[9rem]'
                : 'order-3 border-amber-600 bg-orange-50 dark:bg-orange-950/20 min-w-[9rem]')
          }
        >
          <span className="text-2xl">
            {entry.place === 1 ? '🥇' : entry.place === 2 ? '🥈' : '🥉'}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {placeLabels[entry.place]}
          </span>
          <span className="mt-1 text-lg font-bold">{entry.team!.name}</span>
          {entry.team!.members && entry.team!.members.length > 0 && (
            <span className="mt-0.5 text-xs text-muted-foreground">
              {entry.team!.members.join(', ')}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

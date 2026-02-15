'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RealtimeProvider } from '@/components/realtime/realtime-provider';
import { TimerDisplay } from '@/components/timer/timer-display';
import { BracketView } from '@/components/bracket/bracket-view';
import { Badge } from '@/components/ui/badge';
import type { Event, Team, Match, Round } from '@/lib/db/schema';

function getTeamName(teams: Team[], teamId: string | null): string {
  if (!teamId) return 'TBD';
  const team = teams.find((t) => t.id === teamId);
  return team?.name ?? 'TBD';
}

function BeamerContent({ eventId }: { eventId: string }) {
  const t = useTranslations('beamer');
  const tMatches = useTranslations('matches');
  const tBracket = useTranslations('bracket');
  const tCommon = useTranslations('common');

  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, teamsRes, matchesRes, roundsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/teams`),
        fetch(`/api/events/${eventId}/matches`),
        fetch(`/api/events/${eventId}/rounds`),
      ]);

      if (eventRes.ok) setEvent(await eventRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (matchesRes.ok) setMatches(await matchesRes.json());
      if (roundsRes.ok) setRounds(await roundsRes.json());
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRealtimeEvent = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const inProgress = matches.filter((m) => m.status === 'in_progress');
  const upcoming = matches
    .filter(
      (m) =>
        (m.status === 'pending' || m.status === 'scheduled') &&
        m.team1Id !== null &&
        m.team2Id !== null &&
        !m.isBye
    )
    .sort((a, b) => (a.scheduledRound ?? 0) - (b.scheduledRound ?? 0) || a.matchNumber - b.matchNumber);

  const currentPlayingRound = inProgress.length > 0
    ? inProgress[0].scheduledRound
    : upcoming.length > 0
      ? upcoming[0].scheduledRound
      : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-2xl">{tCommon('loading')}</p>
      </div>
    );
  }

  return (
    <RealtimeProvider eventId={eventId} onEvent={handleRealtimeEvent}>
      <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-white">
        {/* Top: Event name */}
        <div className="shrink-0 border-b border-gray-800 px-8 py-4 text-center">
          <h1 className="text-4xl font-bold">{event?.name ?? ''}</h1>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left 70%: Bracket area */}
          <div className="flex w-[70%] items-center justify-center overflow-auto border-r border-gray-800 p-4">
            {rounds.length > 0 && matches.length > 0 ? (
              <BracketView
                matches={matches}
                rounds={rounds}
                teams={teams}
                mode={(event?.mode as 'single_elimination' | 'double_elimination' | 'group') ?? 'single_elimination'}
                isAdmin={false}
              />
            ) : (
              <p className="text-gray-500">{tBracket('noMatches')}</p>
            )}
          </div>

          {/* Right 30%: Timer, current & next matches */}
          <div className="flex w-[30%] flex-col gap-6 overflow-y-auto p-6">
            {/* Timer */}
            <div className="flex flex-col items-center gap-2">
              <TimerDisplay eventId={eventId} large />
            </div>

            {/* Current Playing Round */}
            {currentPlayingRound != null && currentPlayingRound > 0 && (
              <div className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-center">
                <span className="text-2xl font-bold text-primary">
                  {tBracket('currentRound', { number: currentPlayingRound })}
                </span>
              </div>
            )}

            {/* Current Matches */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-300">
                {t('currentMatches')}
              </h2>
              {inProgress.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t('noCurrentMatches')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {inProgress.map((match) => (
                    <li
                      key={match.id}
                      className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 p-3"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {getTeamName(teams, match.team1Id)}
                        </span>
                        <span className="text-gray-500">{tMatches('vs')}</span>
                        <span className="font-medium">
                          {getTeamName(teams, match.team2Id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.team1Score !== null &&
                          match.team2Score !== null && (
                            <span className="font-mono text-sm tabular-nums">
                              {match.team1Score}:{match.team2Score}
                            </span>
                          )}
                        {match.tableNumber !== null && (
                          <Badge
                            variant="outline"
                            className="border-gray-600 text-gray-300"
                          >
                            {tBracket('table', {
                              number: match.tableNumber,
                            })}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Next Matches */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-300">
                {t('nextMatches')}
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-500">{tMatches('noMatches')}</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.slice(0, 6).map((match) => (
                    <li
                      key={match.id}
                      className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-3"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {match.scheduledRound != null && match.scheduledRound > 0 && (
                          <span className="text-xs font-medium text-primary">
                            R{match.scheduledRound}
                          </span>
                        )}
                        <span>{getTeamName(teams, match.team1Id)}</span>
                        <span className="text-gray-500">{tMatches('vs')}</span>
                        <span>{getTeamName(teams, match.team2Id)}</span>
                      </div>
                      {match.tableNumber !== null && (
                        <Badge
                          variant="outline"
                          className="border-gray-700 text-gray-400"
                        >
                          {tBracket('table', { number: match.tableNumber })}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </RealtimeProvider>
  );
}

export default function BeamerPage() {
  const params = useParams<{ eventId: string }>();

  return <BeamerContent eventId={params.eventId} />;
}

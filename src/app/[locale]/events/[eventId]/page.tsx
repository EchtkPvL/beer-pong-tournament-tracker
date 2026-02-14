'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Header, Footer } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { BracketView } from '@/components/bracket/bracket-view';
import { CurrentMatches } from '@/components/event/current-matches';
import { EventStats } from '@/components/event/event-stats';
import { RealtimeProvider } from '@/components/realtime/realtime-provider';
import type { Event, Team, Match, Round } from '@/lib/db/schema';

function getModeLabel(
  mode: string,
  labels: { group: string; singleElimination: string; doubleElimination: string }
) {
  switch (mode) {
    case 'group':
      return labels.group;
    case 'single_elimination':
      return labels.singleElimination;
    case 'double_elimination':
      return labels.doubleElimination;
    default:
      return mode;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default' as const;
    case 'completed':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

function EventPageContent({ eventId }: { eventId: string }) {
  const t = useTranslations('events');
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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8">
          <p className="text-muted-foreground">{tCommon('loading')}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-8">
          <p className="text-muted-foreground">{tCommon('error')}</p>
        </main>
        <Footer />
      </div>
    );
  }

  const modeLabels = {
    group: t('group'),
    singleElimination: t('singleElimination'),
    doubleElimination: t('doubleElimination'),
  };

  const statusLabel =
    event.status === 'active'
      ? t('active')
      : event.status === 'completed'
        ? t('completed')
        : t('draft');

  return (
    <RealtimeProvider eventId={eventId} onEvent={handleRealtimeEvent}>
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="container mx-auto flex-1 space-y-8 px-4 py-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{event.name}</h1>
              <Badge variant={getStatusVariant(event.status)}>
                {statusLabel}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                {t('date')}: {event.date}
              </span>
              <span>
                {t('location')}: {event.location}
              </span>
              <span>
                {t('mode')}: {getModeLabel(event.mode, modeLabels)}
              </span>
            </div>
          </div>

          <EventStats matches={matches} teams={teams} />

          <CurrentMatches matches={matches} teams={teams} />

          {rounds.length > 0 && matches.length > 0 && (
            <BracketView
              matches={matches}
              rounds={rounds}
              teams={teams}
              mode={event.mode as 'single_elimination' | 'double_elimination' | 'group'}
              isAdmin={false}
            />
          )}
        </main>

        <Footer />
      </div>
    </RealtimeProvider>
  );
}

export default function EventPage() {
  const params = useParams<{ eventId: string }>();

  return <EventPageContent eventId={params.eventId} />;
}

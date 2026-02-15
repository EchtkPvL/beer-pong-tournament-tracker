export const dynamic = 'force-dynamic';

import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { sql, desc } from 'drizzle-orm';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';


function StatusBadge({
  status,
  labels,
}: {
  status: string;
  labels: { draft: string; active: string; completed: string };
}) {
  const variant =
    status === 'active'
      ? 'default'
      : status === 'completed'
        ? 'secondary'
        : 'outline';

  const label =
    status === 'active'
      ? labels.active
      : status === 'completed'
        ? labels.completed
        : labels.draft;

  return <Badge variant={variant}>{label}</Badge>;
}

function ModeLabel({
  mode,
  labels,
}: {
  mode: string;
  labels: { singleElimination: string; doubleElimination: string };
}) {
  switch (mode) {
    case 'single_elimination':
      return <>{labels.singleElimination}</>;
    case 'double_elimination':
      return <>{labels.doubleElimination}</>;
    default:
      return <>{mode}</>;
  }
}

export default async function HomePage() {
  const t = await getTranslations('events');
  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
      mode: events.mode,
      status: events.status,
      teamCount: sql<number>`(SELECT count(*) FROM teams WHERE teams.event_id = "events"."id")`.as(
        'team_count'
      ),
    })
    .from(events)
    .orderBy(desc(events.createdAt));

  // Show active event, or most recent event if none active
  const currentEvent = allEvents.find((e) => e.status === 'active') ?? allEvents[0] ?? null;
  const otherEvents = allEvents.filter((e) => e.id !== currentEvent?.id);

  const statusLabels = {
    draft: t('draft'),
    active: t('active'),
    completed: t('completed'),
  };

  const modeLabels = {
    singleElimination: t('singleElimination'),
    doubleElimination: t('doubleElimination'),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">{t('title')}</h1>

        {currentEvent && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold">
              {currentEvent.status === 'active' ? t('activeEvent') : t('latestEvent')}
            </h2>
            <Card className={currentEvent.status === 'active' ? 'border-primary/50' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{currentEvent.name || t('title')}</CardTitle>
                  <StatusBadge status={currentEvent.status} labels={statusLabels} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
                  {currentEvent.date && (
                    <div>
                      <span className="font-medium text-foreground">{t('date')}:</span>{' '}
                      {currentEvent.date}
                    </div>
                  )}
                  {currentEvent.location && (
                    <div>
                      <span className="font-medium text-foreground">{t('location')}:</span>{' '}
                      {currentEvent.location}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-foreground">{t('mode')}:</span>{' '}
                    <ModeLabel mode={currentEvent.mode} labels={modeLabels} />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Teams:</span>{' '}
                    {t('teamCount', { count: currentEvent.teamCount })}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href={`/events/${currentEvent.id}`}>{t('viewEvent')}</Link>
                </Button>
              </CardFooter>
            </Card>
          </section>
        )}

        <section>
          {otherEvents.length > 0 && (
            <>
              <h2 className="mb-4 text-xl font-semibold">{t('pastEvents')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{event.name || t('title')}</CardTitle>
                        <StatusBadge status={event.status} labels={statusLabels} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {event.date && (
                          <div>
                            {t('date')}: {event.date}
                          </div>
                        )}
                        {event.location && (
                          <div>
                            {t('location')}: {event.location}
                          </div>
                        )}
                        <div>
                          {t('mode')}: <ModeLabel mode={event.mode} labels={modeLabels} />
                        </div>
                        <div>{t('teamCount', { count: event.teamCount })}</div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${event.id}`}>{t('viewEvent')}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}

          {allEvents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('noEvents')}
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { events, teams } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

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
  labels: { group: string; singleElimination: string; doubleElimination: string };
}) {
  switch (mode) {
    case 'group':
      return <>{labels.group}</>;
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
  const tNav = await getTranslations('nav');

  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
      mode: events.mode,
      status: events.status,
      teamCount: sql<number>`(SELECT count(*) FROM teams WHERE teams.event_id = ${events.id})`.as(
        'team_count'
      ),
    })
    .from(events)
    .orderBy(desc(events.createdAt));

  const activeEvent = allEvents.find((e) => e.status === 'active');
  const otherEvents = allEvents.filter((e) => e.id !== activeEvent?.id);

  const statusLabels = {
    draft: t('draft'),
    active: t('active'),
    completed: t('completed'),
  };

  const modeLabels = {
    group: t('group'),
    singleElimination: t('singleElimination'),
    doubleElimination: t('doubleElimination'),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">{t('title')}</h1>

        {activeEvent && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold">{t('activeEvent')}</h2>
            <Card className="border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{activeEvent.name}</CardTitle>
                  <StatusBadge status={activeEvent.status} labels={statusLabels} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <span className="font-medium text-foreground">{t('date')}:</span>{' '}
                    {activeEvent.date}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{t('location')}:</span>{' '}
                    {activeEvent.location}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{t('mode')}:</span>{' '}
                    <ModeLabel mode={activeEvent.mode} labels={modeLabels} />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Teams:</span>{' '}
                    {t('teamCount', { count: activeEvent.teamCount })}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href={`/events/${activeEvent.id}`}>{t('viewEvent')}</Link>
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
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        <StatusBadge status={event.status} labels={statusLabels} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>
                          {t('date')}: {event.date}
                        </div>
                        <div>
                          {t('location')}: {event.location}
                        </div>
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

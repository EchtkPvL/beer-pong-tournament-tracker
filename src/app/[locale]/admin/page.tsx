import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { events, teams } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

export default async function AdminDashboardPage() {
  const t = await getTranslations('events');
  const tAdmin = await getTranslations('admin');

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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{tAdmin('dashboard')}</h1>
        <Button asChild>
          <Link href="/admin/events/new">{tAdmin('newEvent')}</Link>
        </Button>
      </div>

      {allEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('noEvents')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">{t('name')}</th>
                    <th className="pb-3 pr-4 font-medium">{t('date')}</th>
                    <th className="pb-3 pr-4 font-medium">{t('location')}</th>
                    <th className="pb-3 pr-4 font-medium">{t('mode')}</th>
                    <th className="pb-3 pr-4 font-medium">Teams</th>
                    <th className="pb-3 pr-4 font-medium">{t('status')}</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.map((event) => (
                    <tr key={event.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{event.name || '-'}</td>
                      <td className="py-3 pr-4">{event.date || '-'}</td>
                      <td className="py-3 pr-4">{event.location || '-'}</td>
                      <td className="py-3 pr-4">
                        {event.mode === 'group'
                          ? t('group')
                          : event.mode === 'single_elimination'
                            ? t('singleElimination')
                            : t('doubleElimination')}
                      </td>
                      <td className="py-3 pr-4">
                        {t('teamCount', { count: event.teamCount })}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            event.status === 'active'
                              ? 'default'
                              : event.status === 'completed'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {event.status === 'active'
                            ? t('active')
                            : event.status === 'completed'
                              ? t('completed')
                              : t('draft')}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/events/${event.id}`}>
                            {t('manageEvent')}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

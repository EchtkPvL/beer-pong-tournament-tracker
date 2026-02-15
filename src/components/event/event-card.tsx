import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

interface EventWithCount {
  id: string;
  name: string;
  date: string;
  location: string;
  mode: string;
  status: string;
  teamCount: number;
}

interface EventCardProps {
  event: EventWithCount;
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'completed':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getModeLabel(
  mode: string,
  labels: { singleElimination: string; doubleElimination: string }
) {
  switch (mode) {
    case 'single_elimination':
      return labels.singleElimination;
    case 'double_elimination':
      return labels.doubleElimination;
    default:
      return mode;
  }
}

export function EventCard({ event }: EventCardProps) {
  const t = useTranslations('events');

  const statusLabels = {
    draft: t('draft'),
    active: t('active'),
    completed: t('completed'),
  };

  const modeLabels = {
    singleElimination: t('singleElimination'),
    doubleElimination: t('doubleElimination'),
  };

  const statusLabel =
    event.status === 'active'
      ? statusLabels.active
      : event.status === 'completed'
        ? statusLabels.completed
        : statusLabels.draft;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{event.name}</CardTitle>
          <Badge variant={getStatusVariant(event.status)}>{statusLabel}</Badge>
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
            {t('mode')}: {getModeLabel(event.mode, modeLabels)}
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
  );
}

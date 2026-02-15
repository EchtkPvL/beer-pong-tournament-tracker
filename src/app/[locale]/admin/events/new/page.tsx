'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type EventMode = 'single_elimination' | 'double_elimination';

interface FormData {
  name: string;
  date: string;
  location: string;
  mode: EventMode;
}

export default function NewEventPage() {
  const t = useTranslations('events');
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    date: '',
    location: '',
    mode: 'single_elimination',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Check if an open event already exists
  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((events: { status: string }[]) => {
        const hasOpen = events.some((e) => e.status === 'draft' || e.status === 'active');
        if (hasOpen) {
          setBlocked(true);
          setError(t('openEventExists'));
        }
      })
      .catch(() => {});
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        mode: formData.mode,
      };
      if (formData.name) payload.name = formData.name;
      if (formData.date) payload.date = formData.date;
      if (formData.location) payload.location = formData.location;

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      const event = await res.json();
      router.push(`/admin/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{tAdmin('newEvent')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t('name')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{t('date')}</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder={t('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">{t('mode')}</Label>
              <Select
                value={formData.mode}
                onValueChange={(value: EventMode) =>
                  setFormData((prev) => ({ ...prev, mode: value }))
                }
              >
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_elimination">
                    {t('singleElimination')}
                  </SelectItem>
                  <SelectItem value="double_elimination">
                    {t('doubleElimination')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || blocked}>
                {isSubmitting ? tCommon('loading') : tCommon('create')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

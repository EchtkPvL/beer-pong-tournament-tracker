'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimerDisplay } from './timer-display';

interface TimerControlsProps {
  eventId: string;
}

export function TimerControls({ eventId }: TimerControlsProps) {
  const t = useTranslations('timer');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');

  const fetchTimerState = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/timer`);
      if (res.ok) {
        const data = await res.json();
        setTimerStatus(data.status ?? 'stopped');
      }
    } catch {
      // Ignore
    }
  }, [eventId]);

  useEffect(() => {
    fetchTimerState();
    const interval = setInterval(fetchTimerState, 5000);
    return () => clearInterval(interval);
  }, [fetchTimerState]);

  const sendAction = useCallback(
    async (
      action: string,
      extra?: { seconds?: number; durationSeconds?: number }
    ) => {
      setLoading(true);
      try {
        await fetch(`/api/events/${eventId}/timer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        });
        await fetchTimerState();
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    },
    [eventId, fetchTimerState]
  );

  const isStopped = timerStatus === 'stopped';
  const isRunning = timerStatus === 'running';
  const isPaused = timerStatus === 'paused';

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <TimerDisplay eventId={eventId} />
      </div>

      {isStopped && (
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="duration" className="text-xs">{t('duration')}</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={120}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="h-8 w-20 text-sm"
            />
          </div>
          <span className="pb-1 text-xs text-muted-foreground">
            {t('minutes')}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isStopped && (
          <>
            <Button onClick={() => sendAction('start', { durationSeconds: durationMinutes * 60 })} disabled={loading} size="sm">
              {t('start')}
            </Button>
            <Button
              onClick={() => sendAction('reset', { durationSeconds: durationMinutes * 60 })}
              variant="outline"
              disabled={loading}
              size="sm"
            >
              {t('reset')}
            </Button>
          </>
        )}

        {isRunning && (
          <>
            <Button onClick={() => sendAction('pause')} variant="secondary" disabled={loading} size="sm">
              {t('pause')}
            </Button>
            <Button onClick={() => sendAction('stop')} variant="destructive" disabled={loading} size="sm">
              {t('stop')}
            </Button>
          </>
        )}

        {isPaused && (
          <>
            <Button onClick={() => sendAction('start')} disabled={loading} size="sm">
              {t('start')}
            </Button>
            <Button onClick={() => sendAction('stop')} variant="destructive" disabled={loading} size="sm">
              {t('stop')}
            </Button>
          </>
        )}
      </div>

      {(isRunning || isPaused) && (
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => sendAction('add', { seconds: 30 })} variant="outline" size="sm" disabled={loading}>
            {t('addTime', { seconds: 30 })}
          </Button>
          <Button onClick={() => sendAction('add', { seconds: 60 })} variant="outline" size="sm" disabled={loading}>
            {t('addTime', { seconds: 60 })}
          </Button>
          <Button onClick={() => sendAction('remove', { seconds: 30 })} variant="outline" size="sm" disabled={loading}>
            {t('removeTime', { seconds: 30 })}
          </Button>
        </div>
      )}
    </div>
  );
}

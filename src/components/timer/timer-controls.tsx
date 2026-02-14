'use client';

import { useCallback, useState } from 'react';
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
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    },
    [eventId]
  );

  const handleStart = () => {
    sendAction('start', { durationSeconds: durationMinutes * 60 });
  };

  const handlePause = () => {
    sendAction('pause');
  };

  const handleStop = () => {
    sendAction('stop');
  };

  const handleReset = () => {
    sendAction('reset', { durationSeconds: durationMinutes * 60 });
  };

  const handleAddTime = (seconds: number) => {
    sendAction('add', { seconds });
  };

  const handleRemoveTime = (seconds: number) => {
    sendAction('remove', { seconds });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <TimerDisplay eventId={eventId} />
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="duration">{t('duration')}</Label>
          <Input
            id="duration"
            type="number"
            min={1}
            max={120}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <span className="pb-2 text-sm text-muted-foreground">
          {t('minutes')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleStart} disabled={loading}>
          {t('start')}
        </Button>
        <Button onClick={handlePause} variant="secondary" disabled={loading}>
          {t('pause')}
        </Button>
        <Button onClick={handleStop} variant="destructive" disabled={loading}>
          {t('stop')}
        </Button>
        <Button onClick={handleReset} variant="outline" disabled={loading}>
          {t('reset')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleAddTime(30)}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {t('addTime', { seconds: 30 })}
        </Button>
        <Button
          onClick={() => handleAddTime(60)}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {t('addTime', { seconds: 60 })}
        </Button>
        <Button
          onClick={() => handleRemoveTime(30)}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {t('removeTime', { seconds: 30 })}
        </Button>
      </div>
    </div>
  );
}

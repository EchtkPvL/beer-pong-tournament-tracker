'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TimerState } from '@/lib/db/schema';

interface TimerDisplayProps {
  eventId: string;
  large?: boolean;
}

export function TimerDisplay({ eventId, large = false }: TimerDisplayProps) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const rafRef = useRef<number | null>(null);

  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/timer`);
      if (res.ok) {
        const data = await res.json();
        setTimer(data);
      }
    } catch {
      // Ignore fetch errors
    }
  }, [eventId]);

  useEffect(() => {
    fetchTimer();
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, [fetchTimer]);

  useEffect(() => {
    if (!timer) {
      setDisplaySeconds(0);
      return;
    }

    if (timer.status === 'running' && timer.startedAt) {
      const startedAtMs = new Date(timer.startedAt).getTime();

      const tick = () => {
        const elapsedSinceStart = (Date.now() - startedAtMs) / 1000;
        const remaining = Math.max(
          0,
          timer.remainingSeconds - elapsedSinceStart
        );
        setDisplaySeconds(Math.ceil(remaining));

        if (remaining > 0) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);

      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    } else {
      setDisplaySeconds(timer.remainingSeconds);
    }
  }, [timer]);

  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const durationSeconds = timer?.durationSeconds ?? 600;
  const ratio = durationSeconds > 0 ? displaySeconds / durationSeconds : 1;

  const colorClass =
    ratio > 0.5
      ? 'text-green-500'
      : ratio > 0.25
        ? 'text-yellow-500'
        : 'text-red-500';

  return (
    <div
      className={cn(
        'font-mono font-bold tabular-nums',
        colorClass,
        large ? 'text-8xl' : 'text-4xl'
      )}
    >
      {formatted}
    </div>
  );
}

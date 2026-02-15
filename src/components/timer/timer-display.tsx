'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TimerState } from '@/lib/db/schema';

interface TimerDisplayProps {
  eventId: string;
  large?: boolean;
  onExpired?: () => void;
  refreshKey?: number;
}

export function TimerDisplay({ eventId, large = false, onExpired, refreshKey }: TimerDisplayProps) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [expiredFlash, setExpiredFlash] = useState(false);
  const rafRef = useRef<number | null>(null);
  const prevSecondsRef = useRef<number>(0);
  const expiredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Regular polling
  useEffect(() => {
    fetchTimer();
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, [fetchTimer]);

  // Immediate refresh when refreshKey changes (e.g. after admin action)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      fetchTimer();
    }
  }, [refreshKey, fetchTimer]);

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

  // Fire onExpired when timer transitions to 0, auto-clear flash after 30s
  useEffect(() => {
    if (displaySeconds === 0 && prevSecondsRef.current > 0 && timer?.status === 'running') {
      setExpiredFlash(true);
      onExpired?.();

      // Auto-clear flash after 30 seconds
      if (expiredTimeoutRef.current) clearTimeout(expiredTimeoutRef.current);
      expiredTimeoutRef.current = setTimeout(() => setExpiredFlash(false), 30000);
    }
    prevSecondsRef.current = displaySeconds;
  }, [displaySeconds, timer?.status, onExpired]);

  // Clear flash when timer is reset/stopped
  useEffect(() => {
    if (timer?.status === 'stopped' || timer?.status === 'paused') {
      setExpiredFlash(false);
      if (expiredTimeoutRef.current) {
        clearTimeout(expiredTimeoutRef.current);
        expiredTimeoutRef.current = null;
      }
    }
  }, [timer?.status]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (expiredTimeoutRef.current) clearTimeout(expiredTimeoutRef.current);
    };
  }, []);

  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const durationSeconds = timer?.durationSeconds ?? 600;
  const ratio = durationSeconds > 0 ? displaySeconds / durationSeconds : 1;

  const colorClass = expiredFlash
    ? 'text-red-500 animate-timer-pulse'
    : ratio > 0.5
      ? 'text-green-500'
      : ratio > 0.25
        ? 'text-yellow-500'
        : 'text-red-500';

  return (
    <>
      <div
        className={cn(
          'font-mono font-bold tabular-nums',
          colorClass,
          large ? 'text-8xl' : 'text-4xl'
        )}
      >
        {formatted}
      </div>
      <style>{`
        @keyframes timer-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .animate-timer-pulse {
          animation: timer-pulse 0.8s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

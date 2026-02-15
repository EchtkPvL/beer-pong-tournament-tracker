'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Team } from '@/lib/db/schema';

interface TeamSlotProps {
  team: Team | null;
  isBye: boolean;
  isWinner: boolean;
  score: number | null;
  feederLabel?: string;
}

export function TeamSlot({ team, isBye, isWinner, score, feederLabel }: TeamSlotProps) {
  const t = useTranslations('bracket');

  const displayName = team
    ? team.name
    : feederLabel
      ? feederLabel
      : isBye
        ? t('bye')
        : 'TBD';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-2 py-1 text-sm',
        isWinner && 'font-bold text-primary',
        !team && !isBye && 'text-muted-foreground italic'
      )}
    >
      <span className="truncate">{displayName}</span>
      {score !== null && (
        <span
          className={cn(
            'ml-auto shrink-0 tabular-nums',
            isWinner ? 'font-bold text-primary' : 'text-muted-foreground'
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Match, Team } from '@/lib/db/schema';
import { TeamSlot } from './team-slot';

interface MatchCardProps {
  match: Match;
  teams: Record<string, Team>;
  allMatches: Match[];
  onClick?: (match: Match) => void;
  isAdmin: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-400',
  scheduled: 'bg-gray-400',
  in_progress: 'bg-orange-400',
  completed: 'bg-green-500',
};

export function MatchCard({ match, teams, allMatches, onClick, isAdmin }: MatchCardProps) {
  const t = useTranslations('bracket');
  const team1 = match.team1Id ? teams[match.team1Id] ?? null : null;
  const team2 = match.team2Id ? teams[match.team2Id] ?? null : null;

  // Compute feeder labels for empty team slots
  const feeders = allMatches
    .filter((m) => !m.isBye && m.nextMatchId === match.id)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const filledSlots = (match.team1Id ? 1 : 0) + (match.team2Id ? 1 : 0);

  const getFeederLabel = (slot: 0 | 1): string | undefined => {
    let feederIdx: number;
    if (filledSlots === 1 && slot === 1) {
      feederIdx = 0;
    } else if (filledSlots === 0) {
      feederIdx = slot;
    } else {
      return undefined;
    }
    const feeder = feeders[feederIdx];
    if (feeder && feeder.matchNumber > 0) {
      return t('winnerOfMatch', { number: feeder.matchNumber });
    }
    return undefined;
  };

  const isClickable =
    isAdmin &&
    onClick &&
    match.team1Id !== null &&
    match.team2Id !== null &&
    match.status !== 'completed';

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick(match);
    }
  };

  return (
    <div
      className={cn(
        'w-52 rounded-lg border border-border bg-card shadow-sm',
        'transition-colors',
        isClickable && 'cursor-pointer hover:border-primary/50 hover:shadow-md'
      )}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {/* Header with match number, playing round, and status */}
      <div className="flex items-center justify-between border-b border-border px-2 py-1">
        <div className="flex items-center gap-1.5">
          {match.scheduledRound != null && match.scheduledRound > 0 && (
            <span className="text-xs font-medium text-primary">
              R{match.scheduledRound}
            </span>
          )}
          {match.matchNumber > 0 && (
            <span className="text-xs text-muted-foreground">
              #{match.matchNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {match.tableNumber !== null && (
            <span className="text-xs text-muted-foreground">
              T{match.tableNumber}
            </span>
          )}
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              statusColors[match.status] ?? 'bg-gray-400'
            )}
            title={match.status}
          />
        </div>
      </div>

      {/* Team slots */}
      <div className="divide-y divide-border">
        <TeamSlot
          team={team1}
          isBye={match.isBye && !match.team1Id}
          isWinner={match.winnerId !== null && match.winnerId === match.team1Id}
          score={match.team1Score}
          feederLabel={!match.team1Id ? getFeederLabel(0) : undefined}
        />
        <TeamSlot
          team={team2}
          isBye={match.isBye && !match.team2Id}
          isWinner={match.winnerId !== null && match.winnerId === match.team2Id}
          score={match.team2Score}
          feederLabel={!match.team2Id ? getFeederLabel(1) : undefined}
        />
      </div>
    </div>
  );
}

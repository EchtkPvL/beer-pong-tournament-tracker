'use client';


import { cn } from '@/lib/utils';
import type { Match, Team } from '@/lib/db/schema';
import { TeamSlot } from './team-slot';

interface MatchCardProps {
  match: Match;
  teams: Record<string, Team>;
  onClick?: (match: Match) => void;
  isAdmin: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-400',
  scheduled: 'bg-gray-400',
  in_progress: 'bg-orange-400',
  completed: 'bg-green-500',
};

export function MatchCard({ match, teams, onClick, isAdmin }: MatchCardProps) {
  const team1 = match.team1Id ? teams[match.team1Id] ?? null : null;
  const team2 = match.team2Id ? teams[match.team2Id] ?? null : null;

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
        />
        <TeamSlot
          team={team2}
          isBye={match.isBye && !match.team2Id}
          isWinner={match.winnerId !== null && match.winnerId === match.team2Id}
          score={match.team2Score}
        />
      </div>
    </div>
  );
}

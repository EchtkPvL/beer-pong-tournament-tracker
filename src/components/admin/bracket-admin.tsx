'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MatchResultForm } from '@/components/admin/match-result-form';
import { cn } from '@/lib/utils';
import type { Match, Round, Team } from '@/lib/db/schema';

interface BracketAdminProps {
  eventId: string;
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  onRefresh: () => void;
}

interface MatchWithTeamNames {
  id: string;
  matchNumber: number;
  team1Name: string;
  team2Name: string;
  team1Score: number | null;
  team2Score: number | null;
}

export function BracketAdmin({
  eventId,
  matches,
  rounds,
  teams,
  onRefresh,
}: BracketAdminProps) {
  const t = useTranslations('bracket');
  const tCommon = useTranslations('common');
  const tMatches = useTranslations('matches');

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeamNames | null>(
    null
  );
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return t('tbd');
    return teamMap.get(teamId)?.name ?? t('tbd');
  };

  const handleGenerateBracket = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/events/${eventId}/generate-bracket`, {
        method: 'POST',
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMatchClick = (match: Match) => {
    if (!match.team1Id || !match.team2Id) return;
    if (match.isBye) return;

    setSelectedMatch({
      id: match.id,
      matchNumber: match.matchNumber,
      team1Name: getTeamName(match.team1Id),
      team2Name: getTeamName(match.team2Id),
      team1Score: match.team1Score,
      team2Score: match.team2Score,
    });
    setResultDialogOpen(true);
  };

  const handleResult = async (
    matchId: string,
    team1Score: number,
    team2Score: number
  ) => {
    const res = await fetch(`/api/events/${eventId}/matches/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team1Score,
        team2Score,
        status: 'completed',
      }),
    });

    if (res.ok) {
      onRefresh();
    }
  };

  const getStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'active':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getMatchStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return tMatches('pending');
      case 'scheduled':
        return tMatches('scheduled');
      case 'in_progress':
        return tMatches('inProgress');
      case 'completed':
        return t('score');
      default:
        return status;
    }
  };

  const sortedRounds = [...rounds].sort(
    (a, b) => a.roundNumber - b.roundNumber
  );

  const matchesByRound = new Map<string, Match[]>();
  for (const match of matches) {
    const existing = matchesByRound.get(match.roundId) ?? [];
    existing.push(match);
    matchesByRound.set(match.roundId, existing);
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('generate')}</h3>
        </div>

        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-sm text-muted-foreground">{t('noMatches')}</p>
          {teams.length >= 2 ? (
            <Button onClick={handleGenerateBracket} disabled={isGenerating}>
              {isGenerating ? tCommon('loading') : t('generate')}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('needMinTeams')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('generate')}</h3>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              {t('regenerate')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('regenerate')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('regenerateConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleGenerateBracket}>
                {tCommon('confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Rounds overview */}
      {sortedRounds.map((round) => {
        const roundMatches = matchesByRound.get(round.id) ?? [];
        const completedCount = roundMatches.filter(
          (m) => m.status === 'completed'
        ).length;

        return (
          <Card key={round.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{round.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(round.status)}>
                    {round.status === 'completed'
                      ? `${completedCount}/${roundMatches.length}`
                      : round.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roundMatches
                  .sort((a, b) => a.matchNumber - b.matchNumber)
                  .map((match) => (
                    <button
                      key={match.id}
                      onClick={() => handleMatchClick(match)}
                      disabled={
                        !match.team1Id || !match.team2Id || match.isBye
                      }
                      className={cn(
                        'flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors',
                        match.team1Id &&
                          match.team2Id &&
                          !match.isBye &&
                          'hover:bg-accent cursor-pointer',
                        (!match.team1Id || !match.team2Id || match.isBye) &&
                          'cursor-default opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {t('matchNumber', { number: match.matchNumber })}
                        </span>
                        <span className="font-medium">
                          {match.isBye
                            ? `${getTeamName(match.team1Id)} (${t('bye')})`
                            : `${getTeamName(match.team1Id)} ${tMatches('vs')} ${getTeamName(match.team2Id)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {match.tableNumber && (
                          <Badge variant="outline">
                            {t('table', { number: match.tableNumber })}
                          </Badge>
                        )}
                        {match.status === 'completed' &&
                          match.team1Score !== null &&
                          match.team2Score !== null && (
                            <Badge variant="secondary">
                              {match.team1Score} : {match.team2Score}
                            </Badge>
                          )}
                        <Badge variant={getStatusVariant(match.status)}>
                          {getMatchStatusLabel(match.status)}
                        </Badge>
                      </div>
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Match result dialog */}
      {selectedMatch && (
        <MatchResultForm
          match={selectedMatch}
          open={resultDialogOpen}
          onOpenChange={(open) => {
            setResultDialogOpen(open);
            if (!open) setSelectedMatch(null);
          }}
          onResult={handleResult}
        />
      )}
    </div>
  );
}

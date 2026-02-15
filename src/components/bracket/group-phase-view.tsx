'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Match, Round, Team } from '@/lib/db/schema';
import type { GroupStanding } from '@/lib/tournament/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SingleElimBracket } from './single-elim-bracket';
import { DoubleElimBracket } from './double-elim-bracket';

interface GroupPhaseViewProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-400',
  scheduled: 'bg-gray-400',
  in_progress: 'bg-orange-400',
  completed: 'bg-green-500',
};

export function GroupPhaseView({
  matches,
  rounds,
  teams,
  onMatchClick,
  isAdmin,
}: GroupPhaseViewProps) {
  const t = useTranslations('bracket');
  const tStandings = useTranslations('standings');

  // Discover all groups from teams
  const groups = useMemo(() => {
    const groupMap = new Map<string, Team[]>();
    for (const team of teams) {
      if (team.groupId) {
        if (!groupMap.has(team.groupId)) {
          groupMap.set(team.groupId, []);
        }
        groupMap.get(team.groupId)!.push(team);
      }
    }
    return groupMap;
  }, [teams]);

  // Group matches by groupId
  const matchesByGroup = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const match of matches) {
      if (match.groupId) {
        if (!map.has(match.groupId)) {
          map.set(match.groupId, []);
        }
        map.get(match.groupId)!.push(match);
      }
    }
    return map;
  }, [matches]);

  // Calculate standings per group from match data (client-side)
  const standingsByGroup = useMemo(() => {
    const result = new Map<string, GroupStanding[]>();

    for (const [groupId, groupTeams] of groups) {
      const groupMatches = matchesByGroup.get(groupId) ?? [];

      const standingsMap = new Map<string, GroupStanding>();
      for (const team of groupTeams) {
        standingsMap.set(team.id, {
          teamId: team.id,
          teamName: team.name,
          played: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointDiff: 0,
          points: 0,
        });
      }

      for (const match of groupMatches) {
        if (match.status !== 'completed') continue;
        if (!match.team1Id || !match.team2Id) continue;

        const s1 = match.team1Score ?? 0;
        const s2 = match.team2Score ?? 0;

        const team1Standing = standingsMap.get(match.team1Id);
        const team2Standing = standingsMap.get(match.team2Id);

        if (team1Standing) {
          team1Standing.played++;
          team1Standing.pointsFor += s1;
          team1Standing.pointsAgainst += s2;
          if (match.winnerId === match.team1Id) {
            team1Standing.wins++;
          } else {
            team1Standing.losses++;
          }
        }

        if (team2Standing) {
          team2Standing.played++;
          team2Standing.pointsFor += s2;
          team2Standing.pointsAgainst += s1;
          if (match.winnerId === match.team2Id) {
            team2Standing.wins++;
          } else {
            team2Standing.losses++;
          }
        }
      }

      const standings = Array.from(standingsMap.values()).map((s) => ({
        ...s,
        pointDiff: s.pointsFor - s.pointsAgainst,
        points: s.wins * 2 + s.losses,
      }));

      standings.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        return b.pointsFor - a.pointsFor;
      });

      result.set(groupId, standings);
    }

    return result;
  }, [groups, matchesByGroup]);

  // Collect all non-bye matches, sorted by scheduledRound then matchNumber
  const allGroupMatches = useMemo(() => {
    return matches
      .filter((m) => m.groupId && !m.isBye)
      .sort((a, b) => (a.scheduledRound ?? 0) - (b.scheduledRound ?? 0) || a.matchNumber - b.matchNumber);
  }, [matches]);

  // Group matches by scheduledRound
  const matchesByRound = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const match of allGroupMatches) {
      const sr = match.scheduledRound ?? 0;
      if (!map.has(sr)) map.set(sr, []);
      map.get(sr)!.push(match);
    }
    return map;
  }, [allGroupMatches]);

  // Knockout phase data
  const knockoutRounds = useMemo(() => rounds.filter(r => r.phase !== 'group'), [rounds]);
  const knockoutMatches = useMemo(() => matches.filter(m => !m.groupId), [matches]);
  const hasLosersPhase = useMemo(() => knockoutRounds.some(r => r.phase === 'losers'), [knockoutRounds]);

  const groupIds = Array.from(groups.keys()).sort();
  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    for (const team of teams) {
      map[team.id] = team;
    }
    return map;
  }, [teams]);

  if (groupIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('noGroups')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Standings tables */}
      <div className="grid gap-4 md:grid-cols-2">
        {groupIds.map((groupId, groupIndex) => {
          const standings = standingsByGroup.get(groupId) ?? [];
          const groupLabel = String.fromCharCode(65 + groupIndex);

          return (
            <Card key={groupId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {t('group')} {groupLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">#</th>
                      <th className="pb-2 pr-3 font-medium">{tStandings('team')}</th>
                      <th className="pb-2 pr-3 text-center font-medium">{tStandings('played')}</th>
                      <th className="pb-2 pr-3 text-center font-medium">{tStandings('wins')}</th>
                      <th className="pb-2 pr-3 text-center font-medium">{tStandings('losses')}</th>
                      <th className="pb-2 pr-3 text-center font-medium">{tStandings('pointDiff')}</th>
                      <th className="pb-2 text-center font-medium">{tStandings('points')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((standing, idx) => {
                      const standingTeam = teams.find(t2 => t2.id === standing.teamId);
                      const isDQ = standingTeam?.status === 'disqualified';
                      return (
                      <tr
                        key={standing.teamId}
                        className={cn(
                          'border-b border-border/50 last:border-0',
                          idx === 0 && 'font-semibold',
                          isDQ && 'opacity-60'
                        )}
                      >
                        <td className="py-2 pr-3 text-muted-foreground">{idx + 1}</td>
                        <td className={cn("py-2 pr-3 truncate max-w-[160px]", isDQ && 'line-through')}>{standing.teamName}</td>
                        <td className="py-2 pr-3 text-center">{standing.played}</td>
                        <td className="py-2 pr-3 text-center">{standing.wins}</td>
                        <td className="py-2 pr-3 text-center">{standing.losses}</td>
                        <td className="py-2 pr-3 text-center">
                          {standing.pointDiff > 0 ? `+${standing.pointDiff}` : standing.pointDiff}
                        </td>
                        <td className="py-2 text-center font-bold">{standing.points}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Matches section */}
      {allGroupMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('matches')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...matchesByRound.entries()].map(([sr, roundMatches]) => {
                const allDone = roundMatches.every((m) => m.status === 'completed');
                return (
                  <div key={sr} className={cn(allDone && 'opacity-60')}>
                    {sr > 0 && (
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-primary">
                          {t('playingRound', { number: sr })}
                        </h4>
                        <div className="h-px flex-1 bg-border" />
                        {allDone && (
                          <span className="text-xs text-muted-foreground">&#10003;</span>
                        )}
                      </div>
                    )}
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {roundMatches.map((match) => {
                        const team1 = match.team1Id ? teamsMap[match.team1Id] : null;
                        const team2 = match.team2Id ? teamsMap[match.team2Id] : null;
                        const isClickable = isAdmin && onMatchClick && match.team1Id && match.team2Id && match.status !== 'completed';

                        // Find group letter for this match
                        const groupIndex = groupIds.indexOf(match.groupId!);
                        const groupLabel = groupIndex >= 0 ? String.fromCharCode(65 + groupIndex) : '?';

                        return (
                          <button
                            key={match.id}
                            onClick={() => isClickable && onMatchClick?.(match)}
                            disabled={!isClickable}
                            className={cn(
                              'flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors',
                              isClickable && 'hover:bg-accent cursor-pointer',
                              !isClickable && 'cursor-default'
                            )}
                          >
                            <div
                              className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                statusColors[match.status] ?? 'bg-gray-400'
                              )}
                            />
                            <span className="shrink-0 text-xs font-medium text-muted-foreground w-5">
                              {groupLabel}
                            </span>
                            <span className={cn('flex-1 truncate', match.winnerId === match.team1Id && 'font-semibold', team1?.status === 'disqualified' && 'line-through opacity-60')}>
                              {team1?.name ?? t('tbd')}
                            </span>
                            {match.status === 'completed' && match.team1Score !== null && match.team2Score !== null ? (
                              <span className="shrink-0 tabular-nums font-medium">
                                {match.team1Score}:{match.team2Score}
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">vs</span>
                            )}
                            <span className={cn('flex-1 truncate text-right', match.winnerId === match.team2Id && 'font-semibold', team2?.status === 'disqualified' && 'line-through opacity-60')}>
                              {team2?.name ?? t('tbd')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Knockout bracket */}
      {knockoutRounds.length > 0 && knockoutMatches.length > 0 && (
        <div className="overflow-x-auto">
          <div className="min-w-max p-4">
            {hasLosersPhase ? (
              <DoubleElimBracket
                matches={knockoutMatches}
                rounds={knockoutRounds}
                teams={teams}
                onMatchClick={onMatchClick}
                isAdmin={isAdmin}
              />
            ) : (
              <SingleElimBracket
                matches={knockoutMatches}
                rounds={knockoutRounds}
                teams={teams}
                onMatchClick={onMatchClick}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

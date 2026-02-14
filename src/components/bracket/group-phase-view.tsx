'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Match, Round, Team } from '@/lib/db/schema';
import type { GroupStanding } from '@/lib/tournament/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MatchCard } from './match-card';

interface GroupPhaseViewProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  onMatchClick?: (match: Match) => void;
  isAdmin: boolean;
}

export function GroupPhaseView({
  matches,
  rounds,
  teams,
  onMatchClick,
  isAdmin,
}: GroupPhaseViewProps) {
  const t = useTranslations('bracket');

  // Build a lookup of teams by id
  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    for (const team of teams) {
      map[team.id] = team;
    }
    return map;
  }, [teams]);

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

      // Initialize standings
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

      // Process completed matches
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

      // Calculate derived values and sort
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

  const groupIds = Array.from(groups.keys()).sort();

  if (groupIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('noGroups')}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groupIds.map((groupId, groupIndex) => {
        const standings = standingsByGroup.get(groupId) ?? [];
        const groupMatches = (matchesByGroup.get(groupId) ?? []).sort(
          (a, b) => a.matchNumber - b.matchNumber
        );

        return (
          <Card key={groupId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('group')} {String.fromCharCode(65 + groupIndex)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Standings table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium">#</th>
                      <th className="pb-2 pr-2 font-medium">{t('team')}</th>
                      <th className="pb-2 pr-2 text-center font-medium">Sp.</th>
                      <th className="pb-2 pr-2 text-center font-medium">S</th>
                      <th className="pb-2 pr-2 text-center font-medium">N</th>
                      <th className="pb-2 pr-2 text-center font-medium">Diff.</th>
                      <th className="pb-2 text-center font-medium">Pkt.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((standing, idx) => (
                      <tr
                        key={standing.teamId}
                        className={cn(
                          'border-b border-border/50 last:border-0',
                          idx === 0 && 'font-medium'
                        )}
                      >
                        <td className="py-1.5 pr-2 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 pr-2 truncate max-w-[120px]">
                          {standing.teamName}
                        </td>
                        <td className="py-1.5 pr-2 text-center">
                          {standing.played}
                        </td>
                        <td className="py-1.5 pr-2 text-center">
                          {standing.wins}
                        </td>
                        <td className="py-1.5 pr-2 text-center">
                          {standing.losses}
                        </td>
                        <td className="py-1.5 pr-2 text-center">
                          {standing.pointDiff > 0
                            ? `+${standing.pointDiff}`
                            : standing.pointDiff}
                        </td>
                        <td className="py-1.5 text-center font-semibold">
                          {standing.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Group matches */}
              {groupMatches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('matches')}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {groupMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        teams={teamsMap}
                        onClick={onMatchClick}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

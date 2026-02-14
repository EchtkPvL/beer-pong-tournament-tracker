import { db } from '@/lib/db';
import { matches, teams } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import type { GroupStanding } from './types';

/**
 * Calculate group standings from completed matches
 */
export async function calculateGroupStandings(
  eventId: string,
  groupId: string
): Promise<GroupStanding[]> {
  // Get all teams in this group
  const groupTeams = await db.select().from(teams)
    .where(and(eq(teams.eventId, eventId), eq(teams.groupId, groupId)));

  // Get all completed matches in this group
  const groupMatches = await db.select().from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        eq(matches.groupId, groupId),
        eq(matches.status, 'completed'),
        eq(matches.isBye, false)
      )
    );

  const standingsMap = new Map<string, GroupStanding>();

  // Initialize standings
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

  // Process matches
  for (const match of groupMatches) {
    if (!match.team1Id || !match.team2Id) continue;
    const s1 = match.team1Score ?? 0;
    const s2 = match.team2Score ?? 0;

    const team1 = standingsMap.get(match.team1Id);
    const team2 = standingsMap.get(match.team2Id);

    if (team1) {
      team1.played++;
      team1.pointsFor += s1;
      team1.pointsAgainst += s2;
      if (match.winnerId === match.team1Id) {
        team1.wins++;
      } else {
        team1.losses++;
      }
    }

    if (team2) {
      team2.played++;
      team2.pointsFor += s2;
      team2.pointsAgainst += s1;
      if (match.winnerId === match.team2Id) {
        team2.wins++;
      } else {
        team2.losses++;
      }
    }
  }

  // Calculate derived values and sort
  const standings = Array.from(standingsMap.values()).map(s => ({
    ...s,
    pointDiff: s.pointsFor - s.pointsAgainst,
    points: s.wins * 2 + s.losses, // 2 points for win, 1 for loss (played)
  }));

  // Sort: wins desc, point diff desc, points for desc
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsFor - a.pointsFor;
  });

  return standings;
}

/**
 * Check if all group matches are completed
 */
export async function areAllGroupMatchesCompleted(eventId: string): Promise<boolean> {
  const groupMatchesResult = await db.select().from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        eq(matches.status, 'pending')
      )
    )
    .then(rows => rows.filter(m => m.groupId !== null));

  const scheduledGroupMatches = await db.select().from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        eq(matches.status, 'scheduled')
      )
    )
    .then(rows => rows.filter(m => m.groupId !== null));

  const inProgressGroupMatches = await db.select().from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        eq(matches.status, 'in_progress')
      )
    )
    .then(rows => rows.filter(m => m.groupId !== null));

  return groupMatchesResult.length === 0 &&
    scheduledGroupMatches.length === 0 &&
    inProgressGroupMatches.length === 0;
}

import { db } from '@/lib/db';
import { matches, teams } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { logEvent } from '@/lib/realtime/event-log';

/**
 * Set a match result and advance the winner (and loser in double elim)
 */
export async function setMatchResult(
  matchId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  const match = await db.select().from(matches).where(eq(matches.id, matchId)).then(r => r[0]);
  if (!match) throw new Error('Match not found');
  if (!match.team1Id || !match.team2Id) throw new Error('Match does not have both teams');
  if (match.status === 'completed') throw new Error('Match already completed');

  const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
  const loserId = team1Score > team2Score ? match.team2Id : match.team1Id;

  // Update match
  await db.update(matches).set({
    team1Score,
    team2Score,
    winnerId,
    status: 'completed',
  }).where(eq(matches.id, matchId));

  // Advance winner to next match
  if (match.nextMatchId) {
    await placeTeamInMatch(match.nextMatchId, winnerId);
  }

  // Advance loser to losers bracket (double elimination)
  if (match.loserNextMatchId) {
    await placeTeamInMatch(match.loserNextMatchId, loserId);
  }

  // Log event
  await logEvent(match.eventId, 'match_result', {
    matchId,
    team1Score,
    team2Score,
    winnerId,
  });
}

/**
 * Place a team into a match (in the first available slot)
 */
async function placeTeamInMatch(matchId: string, teamId: string): Promise<void> {
  const match = await db.select().from(matches).where(eq(matches.id, matchId)).then(r => r[0]);
  if (!match) return;

  // Determine which slot to use - check which feeder match corresponds to which slot
  // If team1 slot is empty, use it; otherwise use team2
  if (!match.team1Id) {
    await db.update(matches).set({ team1Id: teamId }).where(eq(matches.id, matchId));
  } else if (!match.team2Id) {
    await db.update(matches).set({ team2Id: teamId }).where(eq(matches.id, matchId));

    // If both teams are now set and one needs auto-advance (bye check not needed here for progressed matches)
  }

  // Check if this creates a bye scenario (only one team + the other slot from a bye match)
  const updatedMatch = await db.select().from(matches).where(eq(matches.id, matchId)).then(r => r[0]);
  if (updatedMatch) {
    // Check if all feeder matches for this match are completed
    const feeders = await db.select().from(matches)
      .where(
        or(
          eq(matches.nextMatchId, matchId),
          eq(matches.loserNextMatchId, matchId)
        )
      );

    const allFeedersCompleted = feeders.length > 0 && feeders.every(f => f.status === 'completed');

    if (allFeedersCompleted && updatedMatch.team1Id && !updatedMatch.team2Id) {
      // Only one team arrived and all feeders done - this is effectively a bye
      // Don't auto-complete, the team just waits
    }
  }
}

/**
 * Clear a match result (only if the next match hasn't been played yet)
 */
export async function clearMatchResult(matchId: string): Promise<void> {
  const match = await db.select().from(matches).where(eq(matches.id, matchId)).then(r => r[0]);
  if (!match) throw new Error('Match not found');
  if (match.status !== 'completed') throw new Error('Match is not completed');

  // Check if the winner has already played in the next match
  if (match.nextMatchId && match.winnerId) {
    const nextMatch = await db.select().from(matches).where(eq(matches.id, match.nextMatchId)).then(r => r[0]);
    if (nextMatch && nextMatch.status === 'completed') {
      throw new Error('Cannot clear result: next match already has a result');
    }

    // Remove winner from next match
    if (nextMatch) {
      if (nextMatch.team1Id === match.winnerId) {
        await db.update(matches).set({ team1Id: null }).where(eq(matches.id, match.nextMatchId));
      } else if (nextMatch.team2Id === match.winnerId) {
        await db.update(matches).set({ team2Id: null }).where(eq(matches.id, match.nextMatchId));
      }
    }
  }

  // Remove loser from losers bracket match
  if (match.loserNextMatchId) {
    const loserId = match.team1Id === match.winnerId ? match.team2Id : match.team1Id;
    const loserMatch = await db.select().from(matches).where(eq(matches.id, match.loserNextMatchId)).then(r => r[0]);
    if (loserMatch && loserMatch.status === 'completed') {
      throw new Error('Cannot clear result: losers bracket match already has a result');
    }
    if (loserMatch && loserId) {
      if (loserMatch.team1Id === loserId) {
        await db.update(matches).set({ team1Id: null }).where(eq(matches.id, match.loserNextMatchId));
      } else if (loserMatch.team2Id === loserId) {
        await db.update(matches).set({ team2Id: null }).where(eq(matches.id, match.loserNextMatchId));
      }
    }
  }

  // Clear the match result
  await db.update(matches).set({
    team1Score: null,
    team2Score: null,
    winnerId: null,
    status: 'pending',
  }).where(eq(matches.id, matchId));

  await logEvent(match.eventId, 'match_result_cleared', { matchId });
}

/**
 * Process bye matches - auto-advance teams that have a bye
 */
export async function processByes(eventId: string): Promise<void> {
  const byeMatches = await db.select().from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        eq(matches.isBye, true),
        eq(matches.status, 'pending')
      )
    );

  for (const match of byeMatches) {
    const presentTeamId = match.team1Id || match.team2Id;
    if (!presentTeamId) continue;

    // Mark bye match as completed
    await db.update(matches).set({
      winnerId: presentTeamId,
      team1Score: 0,
      team2Score: 0,
      status: 'completed',
    }).where(eq(matches.id, match.id));

    // Advance to next match
    if (match.nextMatchId) {
      await placeTeamInMatch(match.nextMatchId, presentTeamId);
    }
  }
}

/**
 * Disqualify a team - all future pending matches become losses
 */
export async function disqualifyTeam(teamId: string, eventId: string): Promise<void> {
  // Mark team as disqualified
  await db.update(teams).set({ status: 'disqualified' }).where(eq(teams.id, teamId));

  // Get all pending/scheduled matches involving this team
  const pendingMatches = await db.select().from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        or(
          eq(matches.team1Id, teamId),
          eq(matches.team2Id, teamId)
        )
      )
    );

  for (const match of pendingMatches) {
    if (match.status === 'completed') continue; // Keep historical results

    const opponentId = match.team1Id === teamId ? match.team2Id : match.team1Id;

    if (opponentId) {
      // Opponent wins by forfeit
      await db.update(matches).set({
        team1Score: 0,
        team2Score: 0,
        winnerId: opponentId,
        status: 'completed',
      }).where(eq(matches.id, match.id));

      // Advance opponent
      if (match.nextMatchId) {
        await placeTeamInMatch(match.nextMatchId, opponentId);
      }
    } else {
      // No opponent yet - mark as completed with the DQ team losing
      // The slot will be filled when/if someone arrives
      await db.update(matches).set({
        team1Score: 0,
        team2Score: 0,
        status: 'completed',
      }).where(eq(matches.id, match.id));
    }
  }

  await logEvent(eventId, 'team_disqualified', { teamId });
}

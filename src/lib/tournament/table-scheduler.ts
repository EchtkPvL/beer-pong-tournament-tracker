import { db } from '@/lib/db';
import { matches, events } from '@/lib/db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';

/**
 * Get available tables for an event
 */
export async function getAvailableTables(eventId: number): Promise<number[]> {
  const event = await db.select().from(events).where(eq(events.id, eventId)).then(r => r[0]);
  if (!event) throw new Error('Event not found');

  // Get tables currently in use (matches in_progress with a table assigned)
  const inUse = await db.select({ tableNumber: matches.tableNumber })
    .from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        eq(matches.status, 'in_progress'),
        isNotNull(matches.tableNumber)
      )
    );

  const usedTables = new Set(inUse.map(m => m.tableNumber!));
  const available: number[] = [];

  for (let i = 1; i <= event.tableCount; i++) {
    if (!usedTables.has(i)) {
      available.push(i);
    }
  }

  return available;
}

/**
 * Assign a table to a match
 */
export async function assignTable(matchId: string, tableNumber: number): Promise<void> {
  await db.update(matches).set({
    tableNumber,
    status: 'in_progress',
  }).where(eq(matches.id, matchId));
}

/**
 * Auto-assign available tables to pending matches that have both teams
 */
export async function autoAssignTables(eventId: number): Promise<number> {
  const available = await getAvailableTables(eventId);
  if (available.length === 0) return 0;

  // Get matches ready to be played (both teams present, pending or scheduled)
  const readyMatches = await db.select().from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        isNotNull(matches.team1Id),
        isNotNull(matches.team2Id),
        isNull(matches.tableNumber),
        eq(matches.isBye, false)
      )
    )
    .then(rows => rows.filter(m => m.status === 'pending' || m.status === 'scheduled'));

  let assigned = 0;
  for (let i = 0; i < Math.min(available.length, readyMatches.length); i++) {
    await assignTable(readyMatches[i].id, available[i]);
    assigned++;
  }

  return assigned;
}

/**
 * Free a table (when match is completed)
 */
export async function freeTable(matchId: string): Promise<void> {
  await db.update(matches).set({ tableNumber: null }).where(eq(matches.id, matchId));
}

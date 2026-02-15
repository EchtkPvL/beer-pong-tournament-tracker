import { eq, and, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { matches, type Match } from '@/lib/db/schema';

type CreateMatchData = {
  id?: string;
  eventId: number;
  roundId: string;
  matchNumber: number;
  team1Id?: string | null;
  team2Id?: string | null;
  team1Score?: number | null;
  team2Score?: number | null;
  winnerId?: string | null;
  isBye?: boolean;
  status?: 'pending' | 'scheduled' | 'in_progress' | 'completed';
  tableNumber?: number | null;
  scheduledRound?: number | null;
  bracketPosition?: string | null;
  nextMatchId?: string | null;
  loserNextMatchId?: string | null;
};

export async function getMatchesByEvent(eventId: number) {
  return db
    .select()
    .from(matches)
    .where(eq(matches.eventId, eventId))
    .orderBy(matches.matchNumber);
}

export async function getMatchById(id: string) {
  const rows = await db.select().from(matches).where(eq(matches.id, id));
  return rows[0] ?? null;
}

export async function getMatchesByRound(roundId: string) {
  return db
    .select()
    .from(matches)
    .where(eq(matches.roundId, roundId))
    .orderBy(matches.matchNumber);
}

export async function updateMatch(id: string, data: Partial<Omit<Match, 'id' | 'eventId'>>) {
  const rows = await db
    .update(matches)
    .set(data)
    .where(eq(matches.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function createMatch(data: CreateMatchData) {
  const id = data.id || nanoid();
  const rows = await db
    .insert(matches)
    .values({ ...data, id })
    .returning();
  return rows[0];
}

export async function deleteMatchesByEvent(eventId: number) {
  return db.delete(matches).where(eq(matches.eventId, eventId));
}

export async function allMatchesCompleted(eventId: number): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(matches)
    .where(
      and(
        eq(matches.eventId, eventId),
        eq(matches.isBye, false),
        ne(matches.status, 'completed')
      )
    );
  return (rows[0]?.count ?? 0) === 0;
}

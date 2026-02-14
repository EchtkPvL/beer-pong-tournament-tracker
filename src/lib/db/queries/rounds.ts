import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { rounds, type Round } from '@/lib/db/schema';

export async function getRoundsByEvent(eventId: string) {
  return db
    .select()
    .from(rounds)
    .where(eq(rounds.eventId, eventId))
    .orderBy(rounds.roundNumber);
}

export async function createRound(data: Omit<Round, 'id'> & { id?: string }) {
  const id = data.id || nanoid();
  const rows = await db
    .insert(rounds)
    .values({ ...data, id })
    .returning();
  return rows[0];
}

export async function updateRound(id: string, data: Partial<Omit<Round, 'id' | 'eventId'>>) {
  const rows = await db
    .update(rounds)
    .set(data)
    .where(eq(rounds.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteRoundsByEvent(eventId: string) {
  return db.delete(rounds).where(eq(rounds.eventId, eventId));
}

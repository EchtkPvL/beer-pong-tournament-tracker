import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { timerState, type TimerState } from '@/lib/db/schema';

export async function getTimerByEvent(eventId: string) {
  const rows = await db
    .select()
    .from(timerState)
    .where(eq(timerState.eventId, eventId));
  return rows[0] ?? null;
}

export async function upsertTimer(
  eventId: string,
  data: Partial<Omit<TimerState, 'id' | 'eventId'>>
) {
  const id = nanoid();
  const rows = await db
    .insert(timerState)
    .values({ ...data, id, eventId })
    .onConflictDoUpdate({
      target: timerState.eventId,
      set: data,
    })
    .returning();
  return rows[0];
}

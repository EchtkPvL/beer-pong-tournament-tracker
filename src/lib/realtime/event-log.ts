import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { eventLog } from '@/lib/db/schema';

export async function logEvent(
  eventId: number,
  action: string,
  payload?: unknown
) {
  const id = nanoid();
  const rows = await db
    .insert(eventLog)
    .values({
      id,
      eventId,
      action,
      payload: payload ?? null,
      createdAt: new Date(),
    })
    .returning();
  return rows[0];
}

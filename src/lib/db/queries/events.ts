import { eq, ne, and, or, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, type NewEvent } from '@/lib/db/schema';

export async function getAllEvents() {
  return db.select().from(events).orderBy(desc(events.createdAt));
}

export async function getEventById(id: number) {
  const rows = await db.select().from(events).where(eq(events.id, id));
  return rows[0] ?? null;
}

export async function hasOpenEvent(): Promise<boolean> {
  const rows = await db
    .select({ id: events.id })
    .from(events)
    .where(or(eq(events.status, 'draft'), eq(events.status, 'active')))
    .limit(1);
  return rows.length > 0;
}

export async function createEvent(data: Omit<NewEvent, 'id' | 'createdAt' | 'updatedAt'>) {
  const rows = await db
    .insert(events)
    .values(data)
    .returning();
  return rows[0];
}

export async function updateEvent(id: number, data: Partial<Omit<NewEvent, 'id' | 'createdAt'>>) {
  // If setting this event to active, deactivate all other active events first
  if (data.status === 'active') {
    await db
      .update(events)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(eq(events.status, 'active'), ne(events.id, id)));
  }

  const rows = await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteEvent(id: number) {
  const rows = await db
    .delete(events)
    .where(eq(events.id, id))
    .returning();
  return rows[0] ?? null;
}

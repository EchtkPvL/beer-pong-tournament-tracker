import { eq, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { teams, type NewTeam } from '@/lib/db/schema';

export async function getTeamsByEvent(eventId: string) {
  return db
    .select()
    .from(teams)
    .where(eq(teams.eventId, eventId))
    .orderBy(teams.seed);
}

export async function getTeamById(id: string) {
  const rows = await db.select().from(teams).where(eq(teams.id, id));
  return rows[0] ?? null;
}

export async function createTeam(
  eventId: string,
  data: Omit<NewTeam, 'id' | 'eventId'>
) {
  const id = nanoid();
  const rows = await db
    .insert(teams)
    .values({ ...data, id, eventId })
    .returning();
  return rows[0];
}

export async function updateTeam(id: string, data: Partial<Omit<NewTeam, 'id' | 'eventId'>>) {
  const rows = await db
    .update(teams)
    .set(data)
    .where(eq(teams.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTeam(id: string) {
  const rows = await db
    .delete(teams)
    .where(eq(teams.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function getTeamCount(eventId: string) {
  const rows = await db
    .select({ value: count() })
    .from(teams)
    .where(eq(teams.eventId, eventId));
  return rows[0].value;
}

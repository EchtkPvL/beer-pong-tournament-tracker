import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { nanoid } from 'nanoid';
import { events, teams, timerState } from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://bptt:bptt@localhost:5432/bptt';
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  console.log('Seeding database...');

  // Create a sample event
  const eventId = nanoid();
  await db.insert(events).values({
    id: eventId,
    name: 'Sommerfest Turnier 2025',
    date: '2025-07-15',
    location: 'Biergarten am See',
    mode: 'single_elimination',
    status: 'draft',
    tableCount: 2,
  });

  // Create sample teams
  const teamNames = [
    { name: 'Die Bierkönige', members: ['Max', 'Moritz'] },
    { name: 'Ping Pong Piraten', members: ['Hans', 'Franz'] },
    { name: 'Wurfteufel', members: ['Klaus', 'Petra'] },
    { name: 'Die Unbesiegbaren', members: ['Anna', 'Lisa'] },
    { name: 'Becherflüsterer', members: ['Tom', 'Jerry'] },
    { name: 'Ballmagier', members: ['Kai', 'Lea'] },
    { name: 'Treffsicher', members: ['Jan', 'Mia'] },
  ];

  for (let i = 0; i < teamNames.length; i++) {
    await db.insert(teams).values({
      id: nanoid(),
      eventId,
      name: teamNames[i].name,
      members: teamNames[i].members,
      seed: i + 1,
      status: 'active',
    });
  }

  // Create timer state
  await db.insert(timerState).values({
    id: nanoid(),
    eventId,
    durationSeconds: 600,
    remainingSeconds: 600,
    status: 'stopped',
  });

  console.log(`Created event: ${eventId}`);
  console.log(`Created ${teamNames.length} teams`);
  console.log('Seed complete!');

  await client.end();
}

seed().catch(console.error);

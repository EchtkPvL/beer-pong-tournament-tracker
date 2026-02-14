import { pgTable, text, integer, boolean, timestamp, json, unique } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  location: text('location').notNull(),
  mode: text('mode', { enum: ['group', 'single_elimination', 'double_elimination'] }).notNull(),
  status: text('status', { enum: ['draft', 'active', 'completed'] }).notNull().default('draft'),
  tableCount: integer('table_count').notNull().default(1),
  groupCount: integer('group_count'),
  teamsAdvancePerGroup: integer('teams_advance_per_group'),
  knockoutMode: text('knockout_mode', { enum: ['single_elimination', 'double_elimination'] }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  members: json('members').$type<string[]>(),
  seed: integer('seed'),
  status: text('status', { enum: ['active', 'disqualified'] }).notNull().default('active'),
  groupId: text('group_id'),
}, (table) => [
  unique('teams_event_name_unique').on(table.eventId, table.name),
]);

export const rounds = pgTable('rounds', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  phase: text('phase', { enum: ['group', 'winners', 'losers', 'finals'] }).notNull(),
  name: text('name').notNull(),
  status: text('status', { enum: ['pending', 'active', 'completed'] }).notNull().default('pending'),
});

export const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  matchNumber: integer('match_number').notNull(),
  team1Id: text('team1_id').references(() => teams.id),
  team2Id: text('team2_id').references(() => teams.id),
  team1Score: integer('team1_score'),
  team2Score: integer('team2_score'),
  winnerId: text('winner_id').references(() => teams.id),
  isBye: boolean('is_bye').notNull().default(false),
  status: text('status', { enum: ['pending', 'scheduled', 'in_progress', 'completed'] }).notNull().default('pending'),
  tableNumber: integer('table_number'),
  bracketPosition: text('bracket_position'),
  nextMatchId: text('next_match_id'),
  loserNextMatchId: text('loser_next_match_id'),
  groupId: text('group_id'),
});

export const timerState = pgTable('timer_state', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }).unique(),
  roundId: text('round_id').references(() => rounds.id),
  durationSeconds: integer('duration_seconds').notNull().default(600),
  remainingSeconds: integer('remaining_seconds').notNull().default(600),
  status: text('status', { enum: ['stopped', 'running', 'paused'] }).notNull().default('stopped'),
  startedAt: timestamp('started_at'),
});

export const eventLog = pgTable('event_log', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  payload: json('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Round = typeof rounds.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type TimerState = typeof timerState.$inferSelect;
export type EventLogEntry = typeof eventLog.$inferSelect;

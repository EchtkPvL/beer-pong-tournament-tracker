import { z } from 'zod';

export const loginSchema = z.object({
  password: z.string().min(1),
});

export const createEventSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().min(1),
  location: z.string().min(1).max(200),
  mode: z.enum(['group', 'single_elimination', 'double_elimination']),
  tableCount: z.number().int().min(1).max(20).default(1),
  groupCount: z.number().int().min(2).max(16).nullable().optional(),
  teamsAdvancePerGroup: z.number().int().min(1).max(8).nullable().optional(),
  knockoutMode: z.enum(['single_elimination', 'double_elimination']).nullable().optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(['draft', 'active', 'completed']).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  members: z.array(z.string()).nullable().optional(),
  seed: z.number().int().min(1).nullable().optional(),
});

export const updateTeamSchema = createTeamSchema.partial().extend({
  status: z.enum(['active', 'disqualified']).optional(),
  groupId: z.string().nullable().optional(),
});

export const updateMatchSchema = z.object({
  team1Score: z.number().int().min(0).nullable().optional(),
  team2Score: z.number().int().min(0).nullable().optional(),
  status: z.enum(['pending', 'scheduled', 'in_progress', 'completed']).optional(),
  tableNumber: z.number().int().min(1).nullable().optional(),
});

export const setMatchResultSchema = z.object({
  team1Score: z.number().int().min(0),
  team2Score: z.number().int().min(0),
}).refine(data => data.team1Score !== data.team2Score, {
  message: 'Scores cannot be equal - there must be a winner',
});

export const timerSchema = z.object({
  action: z.enum(['start', 'pause', 'stop', 'reset', 'add', 'remove']),
  seconds: z.number().int().optional(),
  durationSeconds: z.number().int().min(1).optional(),
});

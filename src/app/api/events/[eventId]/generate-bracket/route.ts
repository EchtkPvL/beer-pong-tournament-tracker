import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getEventById } from '@/lib/db/queries/events';
import { getTeamsByEvent, updateTeam } from '@/lib/db/queries/teams';
import { deleteMatchesByEvent } from '@/lib/db/queries/matches';
import { deleteRoundsByEvent, createRound } from '@/lib/db/queries/rounds';
import { createMatch } from '@/lib/db/queries/matches';
import { generateSingleEliminationBracket } from '@/lib/tournament/single-elimination';
import { generateDoubleEliminationBracket } from '@/lib/tournament/double-elimination';
import { generateGroupPhase } from '@/lib/tournament/group-phase';
import { processByes } from '@/lib/tournament/match-progression';
import { assignSchedule } from '@/lib/tournament/schedule';
import { logEvent } from '@/lib/realtime/event-log';
import type { TeamSeed } from '@/lib/tournament/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId: rawEventId } = await params;
    const eventId = parseInt(rawEventId, 10);

    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const teams = await getTeamsByEvent(eventId);
    if (teams.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 teams' }, { status: 400 });
    }

    // Delete existing bracket data
    await deleteMatchesByEvent(eventId);
    await deleteRoundsByEvent(eventId);

    // Prepare team seeds
    const teamSeeds: TeamSeed[] = teams
      .filter(t => t.status === 'active')
      .map((t, i) => ({
        id: t.id,
        seed: t.seed || i + 1,
        name: t.name,
      }));

    let bracket;

    switch (event.mode) {
      case 'single_elimination':
        bracket = generateSingleEliminationBracket(eventId, teamSeeds);
        break;
      case 'double_elimination':
        bracket = generateDoubleEliminationBracket(eventId, teamSeeds);
        break;
      case 'group':
        bracket = generateGroupPhase(eventId, teamSeeds, event.groupCount || 2);
        break;
      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // Assign playing rounds based on table count
    assignSchedule(bracket, event.tableCount);

    // Insert rounds
    for (const round of bracket.rounds) {
      await createRound({
        id: round.id,
        eventId,
        roundNumber: round.roundNumber,
        phase: round.phase,
        name: round.name,
        status: 'pending',
      });
    }

    // Insert matches
    for (const match of bracket.matches) {
      await createMatch({
        id: match.id,
        eventId,
        roundId: match.roundId,
        matchNumber: match.matchNumber,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        isBye: match.isBye,
        status: 'pending',
        scheduledRound: match.scheduledRound,
        bracketPosition: match.bracketPosition,
        nextMatchId: match.nextMatchId,
        loserNextMatchId: match.loserNextMatchId,
        groupId: match.groupId,
      });
    }

    // For group mode, assign groupId to teams based on match assignments
    if (event.mode === 'group') {
      const teamGroupMap = new Map<string, string>();
      for (const match of bracket.matches) {
        if (match.groupId) {
          if (match.team1Id) teamGroupMap.set(match.team1Id, match.groupId);
          if (match.team2Id) teamGroupMap.set(match.team2Id, match.groupId);
        }
      }
      for (const [teamId, groupId] of teamGroupMap) {
        await updateTeam(teamId, { groupId });
      }
    }

    // Process byes - auto-advance teams with byes
    await processByes(eventId);

    await logEvent(eventId, 'bracket_generated', { mode: event.mode, teamCount: teamSeeds.length });

    return NextResponse.json({ ok: true, rounds: bracket.rounds.length, matches: bracket.matches.length });
  } catch (error) {
    console.error('Bracket generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

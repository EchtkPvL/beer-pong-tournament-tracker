import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { updateTeamSchema } from '@/lib/validators';
import { updateTeam, deleteTeam, getTeamById } from '@/lib/db/queries/teams';
import { disqualifyTeam } from '@/lib/tournament/match-progression';

type RouteParams = { params: Promise<{ eventId: string; teamId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId: rawEventId, teamId } = await params;
    const eventId = parseInt(rawEventId, 10);
    const body = await request.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // If disqualifying, use the full disqualification flow (forfeit matches, advance opponents)
    if (parsed.data.status === 'disqualified') {
      const existing = await getTeamById(teamId);
      if (!existing) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      if (existing.status !== 'disqualified') {
        await disqualifyTeam(teamId, eventId);
      }
      const team = await getTeamById(teamId);
      return NextResponse.json(team);
    }

    const team = await updateTeam(teamId, parsed.data);

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof Error && error.message.includes('teams_event_name_unique')) {
      return NextResponse.json(
        { error: 'Team name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const team = await deleteTeam(teamId);

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

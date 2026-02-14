import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { updateMatchSchema, setMatchResultSchema } from '@/lib/validators';
import { getMatchById, updateMatch } from '@/lib/db/queries/matches';
import { setMatchResult, clearMatchResult } from '@/lib/tournament/match-progression';

type RouteParams = { params: Promise<{ eventId: string; matchId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = await params;
    const body = await request.json();

    const existing = await getMatchById(matchId);
    if (!existing) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check if this is a result submission (both scores present)
    if (
      body.team1Score !== undefined &&
      body.team2Score !== undefined &&
      body.team1Score !== null &&
      body.team2Score !== null
    ) {
      const resultParsed = setMatchResultSchema.safeParse(body);
      if (!resultParsed.success) {
        return NextResponse.json(
          { error: 'Invalid result', details: resultParsed.error.flatten() },
          { status: 400 }
        );
      }

      await setMatchResult(matchId, resultParsed.data.team1Score, resultParsed.data.team2Score);
      const updated = await getMatchById(matchId);
      return NextResponse.json(updated);
    }

    // Check if this is a clear result request
    if (body.clearResult) {
      await clearMatchResult(matchId);
      const updated = await getMatchById(matchId);
      return NextResponse.json(updated);
    }

    // Otherwise it's a general update (table assignment, status change, etc.)
    const parsed = updateMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const match = await updateMatch(matchId, parsed.data);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

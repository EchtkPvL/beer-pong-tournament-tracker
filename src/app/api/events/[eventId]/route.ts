import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { updateEventSchema } from '@/lib/validators';
import { getEventById, updateEvent, deleteEvent } from '@/lib/db/queries/events';
import { deleteMatchesByEvent } from '@/lib/db/queries/matches';
import { deleteRoundsByEvent } from '@/lib/db/queries/rounds';

type RouteParams = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: rawEventId } = await params;
    const eventId = parseInt(rawEventId, 10);
    const event = await getEventById(eventId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId: rawEventId } = await params;
    const eventId = parseInt(rawEventId, 10);
    const body = await request.json();
    const { resetMatches, ...updateBody } = body;
    const parsed = updateEventSchema.safeParse(updateBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // When reverting to draft, delete all matches and rounds
    if (parsed.data.status === 'draft' && resetMatches) {
      await deleteMatchesByEvent(eventId);
      await deleteRoundsByEvent(eventId);
    }

    const event = await updateEvent(eventId, parsed.data);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch {
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

    const { eventId: rawEventId } = await params;
    const eventId = parseInt(rawEventId, 10);
    const event = await deleteEvent(eventId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

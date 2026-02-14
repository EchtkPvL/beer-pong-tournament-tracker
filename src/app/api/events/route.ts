import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { createEventSchema } from '@/lib/validators';
import { getAllEvents, createEvent, hasOpenEvent } from '@/lib/db/queries/events';

export async function GET() {
  try {
    const events = await getAllEvents();
    return NextResponse.json(events);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (await hasOpenEvent()) {
      return NextResponse.json(
        { error: 'An open event already exists. Complete or delete it first.' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const event = await createEvent(parsed.data);
    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

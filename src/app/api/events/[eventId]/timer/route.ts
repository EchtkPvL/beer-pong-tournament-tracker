import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { timerSchema } from '@/lib/validators';
import { getTimerByEvent, upsertTimer } from '@/lib/db/queries/timer';

type RouteParams = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const timer = await getTimerByEvent(eventId);
    return NextResponse.json(timer);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('bptt-session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;
    const body = await request.json();
    const parsed = timerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, seconds, durationSeconds } = parsed.data;
    const current = await getTimerByEvent(eventId);

    let timerData: Record<string, unknown> = {};

    switch (action) {
      case 'start':
        timerData = {
          status: 'running',
          startedAt: new Date(),
          ...(durationSeconds && { durationSeconds, remainingSeconds: durationSeconds }),
        };
        break;
      case 'pause':
        timerData = {
          status: 'paused',
          remainingSeconds: current?.remainingSeconds ?? 600,
        };
        break;
      case 'stop':
        timerData = {
          status: 'stopped',
          remainingSeconds: current?.durationSeconds ?? 600,
          startedAt: null,
        };
        break;
      case 'reset':
        timerData = {
          status: 'stopped',
          remainingSeconds: durationSeconds ?? current?.durationSeconds ?? 600,
          startedAt: null,
          ...(durationSeconds && { durationSeconds }),
        };
        break;
      case 'add':
        timerData = {
          remainingSeconds: (current?.remainingSeconds ?? 0) + (seconds ?? 60),
        };
        break;
      case 'remove':
        timerData = {
          remainingSeconds: Math.max(0, (current?.remainingSeconds ?? 0) - (seconds ?? 60)),
        };
        break;
    }

    const timer = await upsertTimer(eventId, timerData);
    return NextResponse.json(timer);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

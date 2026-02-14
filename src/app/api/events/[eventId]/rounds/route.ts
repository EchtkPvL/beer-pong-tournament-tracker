import { NextRequest, NextResponse } from 'next/server';
import { getRoundsByEvent } from '@/lib/db/queries/rounds';

type RouteParams = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: rawEventId } = await params;
    const eventId = parseInt(rawEventId, 10);
    const rounds = await getRoundsByEvent(eventId);
    return NextResponse.json(rounds);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

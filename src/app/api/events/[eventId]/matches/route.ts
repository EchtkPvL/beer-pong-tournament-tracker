import { NextRequest, NextResponse } from 'next/server';
import { getMatchesByEvent } from '@/lib/db/queries/matches';

type RouteParams = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const matches = await getMatchesByEvent(eventId);
    return NextResponse.json(matches);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

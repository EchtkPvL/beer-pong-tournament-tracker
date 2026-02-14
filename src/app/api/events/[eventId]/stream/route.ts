import { NextRequest } from 'next/server';
import { createSSEStream } from '@/lib/realtime/sse-stream';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: rawEventId } = await params;
  const eventId = parseInt(rawEventId, 10);

  const stream = createSSEStream(eventId);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

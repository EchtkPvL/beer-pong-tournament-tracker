import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { eventLog } from '@/lib/db/schema';

export function createSSEStream(eventId: string): ReadableStream {
  let lastTimestamp = new Date();
  let cancelled = false;

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial heartbeat
      sendEvent({ type: 'connected', eventId });

      const poll = async () => {
        while (!cancelled) {
          try {
            const newEntries = await db
              .select()
              .from(eventLog)
              .where(
                and(
                  eq(eventLog.eventId, eventId),
                  gt(eventLog.createdAt, lastTimestamp)
                )
              )
              .orderBy(eventLog.createdAt);

            for (const entry of newEntries) {
              sendEvent({
                type: entry.action,
                payload: entry.payload,
                timestamp: entry.createdAt.toISOString(),
              });
              lastTimestamp = entry.createdAt;
            }
          } catch {
            // Ignore polling errors, will retry on next tick
          }

          // Wait 1 second before next poll
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      };

      poll();
    },

    cancel() {
      cancelled = true;
    },
  });
}

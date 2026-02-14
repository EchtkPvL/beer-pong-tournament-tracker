'use client';

import { createContext, useCallback, useEffect, useRef, useState } from 'react';

export interface RealtimeEvent {
  type: string;
  payload?: unknown;
  timestamp?: string;
}

export interface RealtimeContextValue {
  lastEvent: RealtimeEvent | null;
  isConnected: boolean;
}

export const RealtimeContext = createContext<RealtimeContextValue>({
  lastEvent: null,
  isConnected: false,
});

interface RealtimeProviderProps {
  eventId: string;
  children: React.ReactNode;
  onEvent?: (event: RealtimeEvent) => void;
}

export function RealtimeProvider({
  eventId,
  children,
  onEvent,
}: RealtimeProviderProps) {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const source = new EventSource(`/api/events/${eventId}/stream`);

    source.onopen = () => {
      setIsConnected(true);
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;
        setLastEvent(data);
        onEventRef.current?.(data);
      } catch {
        // Ignore malformed SSE data
      }
    };

    source.onerror = () => {
      setIsConnected(false);
      source.close();

      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        connect();
      }, 3000);
    };

    return source;
  }, [eventId]);

  useEffect(() => {
    const source = connect();

    return () => {
      source.close();
      setIsConnected(false);
    };
  }, [connect]);

  return (
    <RealtimeContext.Provider value={{ lastEvent, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
}

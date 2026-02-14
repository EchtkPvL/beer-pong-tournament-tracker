'use client';

import { useContext } from 'react';
import { RealtimeContext } from './realtime-provider';
import type { RealtimeContextValue } from './realtime-provider';

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  return context;
}

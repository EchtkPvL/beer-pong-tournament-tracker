'use client';

import { useEffect, useRef } from 'react';

const POLL_INTERVAL = 60_000; // 60 seconds

export function VersionCheck() {
  const buildVersion = useRef(process.env.NEXT_PUBLIC_COMMIT_SHA ?? '');

  useEffect(() => {
    if (!buildVersion.current) return;

    const check = async () => {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== buildVersion.current) {
          window.location.reload();
        }
      } catch {
        // ignore network errors
      }
    };

    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return null;
}

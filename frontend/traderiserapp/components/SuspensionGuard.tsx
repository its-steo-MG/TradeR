// components/SuspensionGuard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuspensionGuard() {
  const router = useRouter();

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('suspensionDetails');
    if (!stored) return;

    try {
      const details = JSON.parse(stored);

      if (details.type === 'temporary' && details.until) {
        const untilDate = new Date(details.until).getTime();
        const now = Date.now();

        if (untilDate > now) {
          // Still suspended → redirect
          router.replace('/suspended');
        } else {
          // Expired → clean up
          localStorage.removeItem('suspensionDetails');
        }
      } else if (details.type === 'permanent') {
        // Permanent → redirect
        router.replace('/suspended');
      }
    } catch (err) {
      // Bad data → clean up
      localStorage.removeItem('suspensionDetails');
    }
  }, [router]);

  return null; // renders nothing
}
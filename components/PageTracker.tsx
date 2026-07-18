'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Sends one first-party page view per navigation.
 *
 * The anonymous id lives in localStorage and identifies a browser, not a
 * person: no name, no email, no fingerprint. It exists so "how many people came
 * from Etsy this week" is answerable without handing that question to a third
 * party. Admin screens are excluded, the owner's own clicks are not traffic.
 */
export function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin') || pathname.startsWith('/studio')) return;

    let anonId = '';
    try {
      anonId = localStorage.getItem('gemystic:anon') ?? '';
      if (!anonId) {
        anonId = crypto.randomUUID();
        localStorage.setItem('gemystic:anon', anonId);
      }
    } catch {
      return; // Storage blocked: do not track rather than work around it.
    }

    const payload = {
      anonId,
      path: pathname,
      referrer: document.referrer || null,
      utmSource: searchParams.get('utm_source'),
      utmMedium: searchParams.get('utm_medium'),
      utmCampaign: searchParams.get('utm_campaign'),
    };

    // keepalive so the view still records if the visitor navigates away at once.
    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}

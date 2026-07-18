'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { CURRENCIES, DEFAULT_CURRENCY, CURRENCY_COOKIE } from '@/lib/currency';

interface Ctx {
  currency: string;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<Ctx>({ currency: DEFAULT_CURRENCY, setCurrency: () => {} });

/**
 * Client currency state, hydrated from the server-read cookie so the first
 * paint already shows the right currency, no USD flash for EU visitors.
 */
export function CurrencyProvider({
  initial,
  children,
}: {
  initial: string;
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState(initial);

  /**
   * Static-page resilience: prerendered pages bake the build-time default into
   * `initial`, so the server-side geo/cookie detection never ran for them.
   * After mount, prefer (1) the visitor's saved cookie, then (2) their browser
   * locale, so currency behaves identically on static and dynamic routes.
   */
  useEffect(() => {
    const fromCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${CURRENCY_COOKIE}=`))
      ?.split('=')[1];
    if (fromCookie && fromCookie in CURRENCIES && fromCookie !== currency) {
      setCurrencyState(fromCookie);
      return;
    }
    if (!fromCookie && initial === DEFAULT_CURRENCY) {
      const region = navigator.language.match(/[a-z]{2}-([A-Z]{2})/)?.[1];
      const EUR = ['AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK'];
      if (region && EUR.includes(region)) setCurrencyState('EUR');
      else if (region === 'PK') setCurrencyState('PKR');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCurrency(code: string) {
    if (!(code in CURRENCIES)) return;
    setCurrencyState(code);
    // A year: the visitor's explicit choice should outlive the session.
    document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): Ctx {
  return useContext(CurrencyContext);
}

'use client';

import { createContext, useContext, useState } from 'react';
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

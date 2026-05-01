import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Period } from './format';

type Ctx = { period: Period; setPeriod: (p: Period) => void };
const C = createContext<Ctx | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>('today');
  return <C.Provider value={{ period, setPeriod }}>{children}</C.Provider>;
}

export function usePeriod() {
  const v = useContext(C);
  if (!v) throw new Error('usePeriod must be used inside PeriodProvider');
  return v;
}

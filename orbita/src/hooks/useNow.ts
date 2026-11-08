import { useEffect, useState } from 'react';
import { todayISO } from '../domain/dates';

/** Current time, re-rendering every `ms` (default: each minute boundary is enough for most screens). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const useToday = () => todayISO(useNow(60_000));

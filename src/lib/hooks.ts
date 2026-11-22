import { useEffect, useState } from 'react';
import { AppState as RNAppState } from 'react-native';

import { dateKey } from './date';

/** Current local date key; updates when the day changes or the app comes to the foreground */
export function useToday(): string {
  const [today, setToday] = useState(dateKey());
  useEffect(() => {
    const check = () => setToday((prev) => {
      const k = dateKey();
      return k === prev ? prev : k;
    });
    const id = setInterval(check, 30000);
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return today;
}

/** Re-renders every `ms` milliseconds (for timers) */
export function useNow(ms = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ms, enabled]);
  return now;
}

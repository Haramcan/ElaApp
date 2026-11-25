export interface HealthData {
  steps: Record<string, number>;
  /** hours of sleep, keyed by the date of waking up */
  sleep: Record<string, number>;
  weights: { date: string; kg: number }[];
}

export interface HealthWorkout {
  start: Date;
  end: Date;
  kcal: number;
  title: string;
  strength: boolean;
}

/** merges overlapping [start,end] intervals (ms) and returns the total duration in ms */
export function unionDuration(intervals: [number, number][]): number {
  const sorted = intervals.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const iv of sorted) {
    if (!cur) cur = [...iv] as [number, number];
    else if (iv[0] <= cur[1]) cur[1] = Math.max(cur[1], iv[1]);
    else {
      total += cur[1] - cur[0];
      cur = [...iv] as [number, number];
    }
  }
  if (cur) total += cur[1] - cur[0];
  return total;
}

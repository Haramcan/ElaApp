// Android Health Connect. The native module is loaded lazily so the app keeps working where it isn't available.
import { dateKey } from './date';
import { unionDuration, type HealthData, type HealthWorkout } from './health.types';

type HC = typeof import('react-native-health-connect');

function hc(): HC | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect') as HC;
  } catch {
    return null;
  }
}

export const healthName: string | null = 'Health Connect';

/** Health Connect SDK status: 3 = available */
const SDK_AVAILABLE = 3;
const EXERCISE_STRENGTH_TRAINING = 70;
const EXERCISE_OTHER_WORKOUT = 0;

let initialized = false;
async function init(m: HC): Promise<boolean> {
  if (initialized) return true;
  try {
    initialized = await m.initialize();
  } catch {
    initialized = false;
  }
  return initialized;
}

export async function healthAvailable(): Promise<boolean> {
  const m = hc();
  if (!m) return false;
  try {
    return (await m.getSdkStatus()) === SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function connectHealth(): Promise<boolean> {
  const m = hc();
  if (!m || !(await init(m))) return false;
  try {
    const granted = await m.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'Weight' },
      { accessType: 'write', recordType: 'Weight' },
      { accessType: 'write', recordType: 'ExerciseSession' },
    ]);
    return granted.length > 0;
  } catch {
    return false;
  }
}

export async function readHealth(days: number): Promise<HealthData> {
  const m = hc();
  const out: HealthData = { steps: {}, sleep: {}, weights: [] };
  if (!m || !(await init(m))) return out;

  for (let i = 0; i < days; i++) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    try {
      const res = await m.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      });
      if (res.COUNT_TOTAL > 0) out.steps[dateKey(start)] = Math.round(res.COUNT_TOTAL);
    } catch {
      // no permission or no data
    }
  }

  const since = new Date(Date.now() - (days + 1) * 86400000).toISOString();
  const now = new Date().toISOString();
  try {
    const res = await m.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: since, endTime: now } });
    const byDay = new Map<string, [number, number][]>();
    for (const r of res.records) {
      const end = new Date(r.endTime);
      const key = dateKey(end);
      const list = byDay.get(key) ?? [];
      list.push([new Date(r.startTime).getTime(), end.getTime()]);
      byDay.set(key, list);
    }
    for (const [key, list] of byDay) {
      const ms = unionDuration(list);
      if (ms > 30 * 60000) out.sleep[key] = ms / 3600000;
    }
  } catch {
    // ignore
  }

  try {
    const res = await m.readRecords('Weight', { timeRangeFilter: { operator: 'between', startTime: since, endTime: now } });
    for (const r of res.records) out.weights.push({ date: dateKey(new Date(r.time)), kg: r.weight.inKilograms });
  } catch {
    // ignore
  }
  return out;
}

export async function writeWeight(kg: number, date: Date): Promise<void> {
  const m = hc();
  if (!m || !(await init(m))) return;
  try {
    await m.insertRecords([{ recordType: 'Weight', weight: { value: kg, unit: 'kilograms' }, time: date.toISOString() }]);
  } catch {
    // ignore
  }
}

export async function writeWorkout(w: HealthWorkout): Promise<void> {
  const m = hc();
  if (!m || !(await init(m))) return;
  try {
    await m.insertRecords([
      {
        recordType: 'ExerciseSession',
        exerciseType: w.strength ? EXERCISE_STRENGTH_TRAINING : EXERCISE_OTHER_WORKOUT,
        title: w.title,
        startTime: w.start.toISOString(),
        endTime: w.end.toISOString(),
      },
    ]);
  } catch {
    // ignore
  }
}

export function openHealthSettings(): void {
  const m = hc();
  try {
    m?.openHealthConnectSettings();
  } catch {
    // ignore
  }
}

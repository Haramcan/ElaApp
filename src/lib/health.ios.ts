// Apple Health (HealthKit). The native module is loaded lazily so the app keeps working where it isn't available.
import { Linking } from 'react-native';

import { dateKey } from './date';
import { unionDuration, type HealthData, type HealthWorkout } from './health.types';

type HK = typeof import('@kingstinct/react-native-healthkit');

function hk(): HK | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@kingstinct/react-native-healthkit') as HK;
  } catch {
    return null;
  }
}

export const healthName: string | null = 'Apple Health';

const READ = ['HKQuantityTypeIdentifierStepCount', 'HKCategoryTypeIdentifierSleepAnalysis', 'HKQuantityTypeIdentifierBodyMass'] as const;
const WRITE = ['HKQuantityTypeIdentifierBodyMass', 'HKWorkoutTypeIdentifier', 'HKQuantityTypeIdentifierActiveEnergyBurned'] as const;

export async function healthAvailable(): Promise<boolean> {
  const m = hk();
  if (!m) return false;
  try {
    return await m.isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

export async function connectHealth(): Promise<boolean> {
  const m = hk();
  if (!m) return false;
  try {
    return await m.requestAuthorization({ toRead: [...READ], toShare: [...WRITE] });
  } catch {
    return false;
  }
}

export async function readHealth(days: number): Promise<HealthData> {
  const m = hk();
  const out: HealthData = { steps: {}, sleep: {}, weights: [] };
  if (!m) return out;

  // steps per calendar day
  for (let i = 0; i < days; i++) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    try {
      const res = await m.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
        filter: { date: { startDate: start, endDate: end } },
        unit: 'count',
      });
      const v = res.sumQuantity?.quantity;
      if (v && v > 0) out.steps[dateKey(start)] = Math.round(v);
    } catch {
      // no permission or no data
    }
  }

  // sleep: union of "asleep" intervals per wake-up date (avoids double counting phone + watch)
  try {
    const since = new Date(Date.now() - (days + 1) * 86400000);
    const samples = await m.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { limit: 0, filter: { date: { startDate: since } } });
    const byDay = new Map<string, { staged: [number, number][]; plain: [number, number][] }>();
    for (const s of samples) {
      const v = Number(s.value);
      // 0 = in bed, 2 = awake; 1 = asleep (unspecified), 3/4/5 = core/deep/REM
      if (v === 0 || v === 2) continue;
      const end = new Date(s.endDate);
      const key = dateKey(end);
      const entry = byDay.get(key) ?? { staged: [], plain: [] };
      (v >= 3 ? entry.staged : entry.plain).push([new Date(s.startDate).getTime(), end.getTime()]);
      byDay.set(key, entry);
    }
    for (const [key, e] of byDay) {
      const ms = unionDuration(e.staged.length ? e.staged : e.plain);
      if (ms > 30 * 60000) out.sleep[key] = ms / 3600000;
    }
  } catch {
    // ignore
  }

  // weight
  try {
    const since = new Date(Date.now() - days * 86400000);
    const samples = await m.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { limit: 50, unit: 'kg', filter: { date: { startDate: since } } });
    for (const s of samples) out.weights.push({ date: dateKey(new Date(s.startDate)), kg: s.quantity });
  } catch {
    // ignore
  }
  return out;
}

export async function writeWeight(kg: number, date: Date): Promise<void> {
  const m = hk();
  if (!m) return;
  try {
    await m.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', kg, date, date);
  } catch {
    // ignore (no permission)
  }
}

export async function writeWorkout(w: HealthWorkout): Promise<void> {
  const m = hk();
  if (!m) return;
  try {
    await m.saveWorkoutSample(
      w.strength ? m.WorkoutActivityType.traditionalStrengthTraining : m.WorkoutActivityType.mixedCardio,
      [],
      w.start,
      w.end,
      { energyBurned: w.kcal },
      { HKWorkoutBrandName: 'FitLife' },
    );
  } catch {
    // ignore
  }
}

export function openHealthSettings(): void {
  void Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
}

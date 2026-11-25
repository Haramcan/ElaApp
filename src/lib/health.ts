// Fallback (web / unsupported platforms). Platform-specific versions live in health.ios.ts and health.android.ts.
import type { HealthData, HealthWorkout } from './health.types';

export const healthName: string | null = null;

export async function healthAvailable(): Promise<boolean> {
  return false;
}

export async function connectHealth(): Promise<boolean> {
  return false;
}

export async function readHealth(_days: number): Promise<HealthData> {
  return { steps: {}, sleep: {}, weights: [] };
}

export async function writeWeight(_kg: number, _date: Date): Promise<void> {}

export async function writeWorkout(_w: HealthWorkout): Promise<void> {}

export function openHealthSettings(): void {}

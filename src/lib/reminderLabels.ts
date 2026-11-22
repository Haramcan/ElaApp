import { formatTime, ISO_WEEKDAY_SHORT } from './date';
import { reminderTimes } from './reminderPlan';
import type { Reminder, ReminderType } from './types';

export const REMINDER_ICONS: Record<ReminderType, string> = {
  water: 'cup-water',
  meal: 'silverware-fork-knife',
  challenge: 'arm-flex',
  workout: 'dumbbell',
  weight: 'scale-bathroom',
  goalcheck: 'check-decagram',
  fasting: 'timer-sand',
  custom: 'bell-outline',
};

export function describeSchedule(r: Reminder): string {
  if (r.type === 'fasting') return 'Bei Erreichen deines Fastenziels';
  const days =
    r.weekdays.length === 7
      ? 'täglich'
      : r.weekdays.length === 5 && [1, 2, 3, 4, 5].every((d) => r.weekdays.includes(d))
        ? 'Mo–Fr'
        : r.weekdays.length === 0
          ? 'nie'
          : [...r.weekdays].sort().map((d) => ISO_WEEKDAY_SHORT[d - 1]).join(', ');
  if (r.mode === 'interval') {
    const h = r.intervalMin % 60 === 0 ? `${r.intervalMin / 60} h` : `${r.intervalMin} min`;
    return `Alle ${h}, ${formatTime(r.startTime.hour, r.startTime.minute)}–${formatTime(r.endTime.hour, r.endTime.minute)} · ${days}`;
  }
  const times = reminderTimes(r).map((t) => formatTime(t.hour, t.minute));
  return `${times.length ? times.join(', ') : 'keine Uhrzeit'} · ${days}`;
}


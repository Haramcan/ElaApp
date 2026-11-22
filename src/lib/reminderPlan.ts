import { formatNumber } from './calc';
import { addDays, dateKey, isoWeekday, parseKey } from './date';
import { challengeProgress, daySummary, entriesFor } from './selectors';
import type { AppState, Reminder, ReminderTime } from './types';

/** iOS allows max. 64 pending local notifications – keep a safety margin */
export const MAX_SCHEDULED = 60;
export const MAX_HORIZON_DAYS = 7;

export interface PlannedNotification {
  key: string;
  date: Date;
  title: string;
  body: string;
  url: string;
}

function at(dayKey: string, t: ReminderTime): Date {
  const d = parseKey(dayKey);
  d.setHours(t.hour, t.minute, 0, 0);
  return d;
}

/** All times of a reminder within a day (ignores weekdays) */
export function reminderTimes(r: Reminder): ReminderTime[] {
  if (r.mode === 'interval') {
    const out: ReminderTime[] = [];
    const step = Math.max(15, r.intervalMin);
    const start = r.startTime.hour * 60 + r.startTime.minute;
    const end = r.endTime.hour * 60 + r.endTime.minute;
    for (let m = start; m <= end && out.length < 48; m += step) {
      out.push({ hour: Math.floor(m / 60), minute: m % 60 });
    }
    return out;
  }
  return [...r.times].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

function urlFor(r: Reminder): string {
  switch (r.type) {
    case 'water':
      return '/';
    case 'meal':
      return '/nutrition';
    case 'challenge':
      return '/challenge';
    case 'workout':
      return '/training';
    case 'weight':
      return '/weight';
    case 'fasting':
      return '/fasting';
    default:
      return '/';
  }
}

/** Returns null if the reminder should be skipped (smart mode), otherwise the (possibly personalised) body */
function todaysBody(r: Reminder, state: AppState, today: string): string | null {
  if (!r.smart) return r.body;
  const s = daySummary(state, today);
  switch (r.type) {
    case 'water': {
      if (s.water >= s.waterGoal) return null;
      return `Noch ${formatNumber(s.waterGoal - s.water)} ml bis zu deinem Wasserziel. ${r.body}`;
    }
    case 'meal': {
      if (r.meal && entriesFor(state, today).some((e) => e.meal === r.meal)) return null;
      return r.body;
    }
    case 'challenge': {
      const p = challengeProgress(state, today);
      const open = p.items.filter((i) => !i.complete);
      if (p.total > 0 && open.length === 0) return null;
      if (open.length === 0) return r.body;
      const list = open
        .slice(0, 3)
        .map((i) => `${i.challenge.target - i.done}${i.challenge.unit === 'sec' ? ' s' : '×'} ${i.challenge.name}`)
        .join(', ');
      return `Noch offen: ${list}. Los geht's! 💪`;
    }
    case 'workout': {
      if (state.workouts.some((w) => w.date === today)) return null;
      return r.body;
    }
    case 'weight': {
      if (state.weights.some((w) => w.date === today)) return null;
      return r.body;
    }
    case 'goalcheck': {
      const parts: string[] = [];
      if (s.remaining > 50) parts.push(`${formatNumber(s.remaining)} kcal übrig`);
      if (s.remaining < -50) parts.push(`${formatNumber(-s.remaining)} kcal über dem Ziel`);
      if (s.water < s.waterGoal) parts.push(`${formatNumber(s.waterGoal - s.water)} ml Wasser offen`);
      const p = challengeProgress(state, today);
      const open = p.total - p.completed;
      if (open > 0) parts.push(`${open} Challenge${open > 1 ? 's' : ''} offen`);
      if (parts.length === 0) return 'Alle Tagesziele erreicht – stark! 🎉';
      return `Stand heute: ${parts.join(', ')}.`;
    }
    default:
      return r.body;
  }
}

export function planNotifications(state: AppState, now: Date = new Date()): PlannedNotification[] {
  const today = dateKey(now);
  const minTime = now.getTime() + 30 * 1000;
  const fixed: PlannedNotification[] = [];

  const reminders = state.reminders.filter((r) => r.enabled && r.type !== 'fasting');

  // fasting end notification
  const fastRem = state.reminders.find((r) => r.type === 'fasting');
  const active = state.fasting.active;
  if (fastRem?.enabled && active) {
    const end = new Date(active.start + active.targetHours * 3600000);
    if (end.getTime() > minTime) {
      fixed.push({
        key: 'fasting-end',
        date: end,
        title: 'Fastenziel erreicht! 🎉',
        body: `Du hast ${active.targetHours} Stunden gefastet. Beende dein Fasten in der App.`,
        url: '/fasting',
      });
    }
  }

  // per-day load to decide how many days ahead we can plan
  let perWeek = 0;
  for (const r of reminders) perWeek += reminderTimes(r).length * r.weekdays.length;
  const perDay = Math.max(1, perWeek / 7);
  const budget = MAX_SCHEDULED - fixed.length - 1; // 1 slot for the "come back" nudge
  const horizon = Math.max(1, Math.min(MAX_HORIZON_DAYS, Math.floor(budget / perDay)));

  const planned: PlannedNotification[] = [];
  for (let d = 0; d < horizon; d++) {
    const day = addDays(today, d);
    const wd = isoWeekday(parseKey(day));
    for (const r of reminders) {
      if (!r.weekdays.includes(wd)) continue;
      const body = d === 0 ? todaysBody(r, state, today) : r.body;
      if (body == null) continue;
      for (const t of reminderTimes(r)) {
        const date = at(day, t);
        if (date.getTime() < minTime) continue;
        planned.push({
          key: `${r.id}-${day}-${t.hour}-${t.minute}`,
          date,
          title: r.title,
          body,
          url: urlFor(r),
        });
      }
    }
  }

  planned.sort((a, b) => a.date.getTime() - b.date.getTime());
  const result = [...fixed, ...planned.slice(0, budget)];

  if (reminders.length > 0) {
    const lastDay = addDays(today, horizon);
    result.push({
      key: 'comeback',
      date: at(lastDay, { hour: 10, minute: 0 }),
      title: 'Wir vermissen dich! 👋',
      body: 'Öffne die App kurz, damit deine Erinnerungen weiterlaufen und deine Serie nicht reißt.',
      url: '/',
    });
  }
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function planSignature(plan: PlannedNotification[]): string {
  return plan.map((p) => `${p.key}|${p.date.getTime()}|${p.title}|${p.body}`).join('\n');
}

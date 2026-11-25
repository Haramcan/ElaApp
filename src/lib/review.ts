import { formatNumber } from './calc';
import { addDays, dateKey, startOfWeek } from './date';
import { sessionVolume } from './gym';
import { challengeProgress, daySummary, sortedWeights } from './selectors';
import type { AppState } from './types';

export interface WeekReview {
  start: string;
  end: string;
  days: string[];
  /** days up to today (for the current week) */
  elapsedDays: number;
  loggedDays: number;
  avgKcal: number;
  avgGoal: number;
  onTargetDays: number;
  avgProtein: number;
  proteinGoal: number;
  waterGoalDays: number;
  avgSteps: number;
  stepGoalDays: number;
  workouts: number;
  workoutGoal: number;
  burned: number;
  gymSessions: number;
  gymVolume: number;
  weightStart?: number;
  weightEnd?: number;
  challengeDays: number;
  avgSleep?: number;
  avgMood?: number;
  highlights: string[];
  tips: string[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function weekReview(state: AppState, anyDayInWeek: string, today: string = dateKey()): WeekReview {
  const start = startOfWeek(anyDayInWeek, state.settings.weekStartsMonday);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = days[6];
  const past = days.filter((d) => d <= today);
  const sums = past.map((d) => daySummary(state, d));
  const logged = sums.filter((s) => s.eaten > 0);
  const onTarget = logged.filter((s) => s.eaten >= s.goal * 0.9 && s.eaten <= s.goal * 1.1).length;
  const waterGoalDays = sums.filter((s) => s.water >= s.waterGoal).length;
  const stepDays = sums.filter((s) => s.steps > 0);
  const workoutDays = new Set(state.workouts.filter((w) => w.date >= start && w.date <= end).map((w) => w.date)).size;
  const burned = state.workouts.filter((w) => w.date >= start && w.date <= end).reduce((a, w) => a + w.kcal, 0);
  const gym = state.gym.sessions.filter((s) => s.date >= start && s.date <= end);
  const weights = sortedWeights(state);
  const inWeek = weights.filter((w) => w.date >= start && w.date <= end);
  const before = weights.filter((w) => w.date < start);
  const weightStart = before.length ? before[before.length - 1].kg : inWeek[0]?.kg;
  const weightEnd = inWeek.length ? inWeek[inWeek.length - 1].kg : undefined;
  const challengeDays = past.filter((d) => {
    const p = challengeProgress(state, d);
    return p.total > 0 && p.completed === p.total;
  }).length;
  const sleeps = past.map((d) => state.sleep[d]?.hours).filter((x): x is number => x != null && x > 0);
  const moods = past.map((d) => state.mood[d]?.score).filter((x): x is number => x != null && x > 0);

  const r: WeekReview = {
    start,
    end,
    days,
    elapsedDays: past.length,
    loggedDays: logged.length,
    avgKcal: avg(logged.map((s) => s.eaten)),
    avgGoal: avg(logged.map((s) => s.goal)) || daySummary(state, today).baseGoal,
    onTargetDays: onTarget,
    avgProtein: avg(logged.map((s) => s.protein)),
    proteinGoal: daySummary(state, today).macroGoals.protein,
    waterGoalDays,
    avgSteps: avg(stepDays.map((s) => s.steps)),
    stepGoalDays: sums.filter((s) => s.steps >= s.stepsGoal).length,
    workouts: workoutDays,
    workoutGoal: state.goals.workoutsPerWeek,
    burned,
    gymSessions: gym.length,
    gymVolume: gym.reduce((a, s) => a + sessionVolume(s), 0),
    weightStart,
    weightEnd,
    challengeDays,
    avgSleep: sleeps.length ? avg(sleeps) : undefined,
    avgMood: moods.length ? avg(moods) : undefined,
    highlights: [],
    tips: [],
  };

  // highlights
  if (r.workouts >= r.workoutGoal) r.highlights.push(`Trainingsziel geschafft: ${r.workouts} von ${r.workoutGoal} Tagen 💪`);
  if (r.onTargetDays >= 4) r.highlights.push(`${r.onTargetDays} Tage im Kalorienziel – sehr konstant!`);
  if (r.waterGoalDays >= 5) r.highlights.push(`${r.waterGoalDays} Tage genug getrunken 💧`);
  if (r.challengeDays >= 5) r.highlights.push(`Challenges an ${r.challengeDays} Tagen komplett erledigt`);
  if (r.gymVolume > 0) r.highlights.push(`${formatNumber(r.gymVolume)} kg im Studio bewegt`);
  if (weightStart != null && weightEnd != null) {
    const diff = weightEnd - weightStart;
    const good = state.profile.goal === 'lose' ? diff < 0 : state.profile.goal === 'gain' ? diff > 0 : Math.abs(diff) < 0.5;
    if (good && Math.abs(diff) >= 0.1) r.highlights.push(`Gewicht ${diff > 0 ? '+' : ''}${formatNumber(diff, 1)} kg – in die richtige Richtung!`);
  }

  // tips
  if (r.loggedDays < Math.min(5, r.elapsedDays)) r.tips.push('Trage an mehr Tagen dein Essen ein – schon die Hauptmahlzeiten helfen.');
  if (r.loggedDays > 0 && r.avgProtein < r.proteinGoal * 0.8)
    r.tips.push(`Ø ${formatNumber(r.avgProtein)} g Eiweiß – Ziel ${formatNumber(r.proteinGoal)} g. Quark, Skyr, Eier oder Hähnchen helfen.`);
  if (r.loggedDays > 0 && r.avgKcal > r.avgGoal * 1.1) r.tips.push('Du lagst im Schnitt über deinem Kalorienziel. Plane Snacks vor oder nutze „Was kann ich noch essen?“.');
  if (r.workouts < r.workoutGoal) r.tips.push(`Plane deine ${r.workoutGoal - r.workouts} fehlenden Trainingstage fest in den Kalender ein.`);
  if (r.waterGoalDays < 3) r.tips.push('Stell dir eine Wasserflasche sichtbar hin – und nutze die Trink-Erinnerung.');
  if (r.avgSleep != null && r.avgSleep < 7) r.tips.push(`Ø ${formatNumber(r.avgSleep, 1)} h Schlaf – 7–9 Stunden fördern Regeneration und weniger Heißhunger.`);
  if (r.tips.length === 0) r.tips.push('Weiter so! Versuche nächste Woche, bei einer Übung das Gewicht zu steigern.');
  return r;
}

/** short one-line summary used in the Sunday notification */
export function weekSummaryLine(state: AppState, today: string = dateKey()): string {
  const r = weekReview(state, today, today);
  const parts: string[] = [];
  parts.push(`${r.workouts}/${r.workoutGoal} Trainingstage`);
  if (r.loggedDays > 0) parts.push(`Ø ${formatNumber(r.avgKcal)} kcal`);
  if (r.weightStart != null && r.weightEnd != null) {
    const d = r.weightEnd - r.weightStart;
    parts.push(`Gewicht ${d > 0 ? '+' : ''}${formatNumber(d, 1)} kg`);
  }
  return `Diese Woche: ${parts.join(' · ')}. Tippe für deinen ganzen Rückblick.`;
}

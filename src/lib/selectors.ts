import { calorieGoal, macroGrams, sumEntries } from './calc';
import { addDays, dateKey, startOfWeek } from './date';
import type { AppState, FoodEntry, MealType } from './types';

export const MEALS: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Frühstück', icon: 'coffee' },
  { id: 'lunch', label: 'Mittagessen', icon: 'food' },
  { id: 'dinner', label: 'Abendessen', icon: 'silverware-fork-knife' },
  { id: 'snack', label: 'Snacks', icon: 'food-apple' },
];

export function mealLabel(m: MealType): string {
  return MEALS.find((x) => x.id === m)?.label ?? m;
}

/** Suggest a meal based on the current time of day */
export function mealForNow(d: Date = new Date()): MealType {
  const h = d.getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

export function entriesFor(state: AppState, date: string): FoodEntry[] {
  return state.foodLog.filter((e) => e.date === date);
}

export function latestWeightKg(state: AppState): number {
  if (state.weights.length === 0) return state.profile.startWeightKg;
  let best = state.weights[0];
  for (const w of state.weights) {
    if (w.date > best.date || (w.date === best.date && w.createdAt > best.createdAt)) best = w;
  }
  return best.kg;
}

export function sortedWeights(state: AppState) {
  return [...state.weights].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
}

/** Base calorie goal (auto adjusts to the latest weight when enabled) */
export function baseCalorieGoal(state: AppState): number {
  if (state.goals.autoCalories) return calorieGoal(state.profile, latestWeightKg(state));
  return state.goals.calories;
}

export function burnedFor(state: AppState, date: string): number {
  return state.workouts.filter((w) => w.date === date).reduce((s, w) => s + w.kcal, 0);
}

export interface DaySummary {
  date: string;
  goal: number;
  baseGoal: number;
  eaten: number;
  burned: number;
  bonus: number;
  remaining: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
  salt: number;
  macroGoals: { protein: number; carbs: number; fat: number };
  water: number;
  waterGoal: number;
  steps: number;
  stepsGoal: number;
}

export function daySummary(state: AppState, date: string): DaySummary {
  const totals = sumEntries(entriesFor(state, date));
  const baseGoal = baseCalorieGoal(state);
  const burned = burnedFor(state, date);
  const bonus = state.settings.eatBackExercise ? Math.round((burned * state.settings.eatBackPercent) / 100) : 0;
  const goal = baseGoal + bonus;
  return {
    date,
    goal,
    baseGoal,
    eaten: totals.kcal,
    burned,
    bonus,
    remaining: goal - totals.kcal,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    sugar: totals.sugar,
    fiber: totals.fiber,
    salt: totals.salt,
    macroGoals: macroGrams(state.goals, goal),
    water: state.water[date] ?? 0,
    waterGoal: state.goals.waterMl,
    steps: state.steps[date] ?? 0,
    stepsGoal: state.goals.steps,
  };
}

export function challengeProgress(state: AppState, date: string) {
  const log = state.challengeLog[date] ?? {};
  const active = state.challenges.filter((c) => c.enabled);
  const items = active.map((c) => ({ challenge: c, done: log[c.id] ?? 0, complete: (log[c.id] ?? 0) >= c.target }));
  return { items, completed: items.filter((i) => i.complete).length, total: items.length };
}

export function hasLoggedDay(state: AppState, date: string): boolean {
  return (
    state.foodLog.some((e) => e.date === date) ||
    (state.water[date] ?? 0) > 0 ||
    state.workouts.some((w) => w.date === date) ||
    Object.values(state.challengeLog[date] ?? {}).some((v) => v > 0)
  );
}

/** Consecutive days with any activity; today counts if logged, otherwise the streak until yesterday is kept */
export function currentStreak(state: AppState, today: string = dateKey()): number {
  const days = new Set<string>();
  for (const e of state.foodLog) days.add(e.date);
  for (const w of state.workouts) days.add(w.date);
  for (const [d, v] of Object.entries(state.water)) if (v > 0) days.add(d);
  for (const [d, log] of Object.entries(state.challengeLog)) if (Object.values(log).some((v) => v > 0)) days.add(d);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function longestStreak(state: AppState): number {
  const days = new Set<string>();
  for (const e of state.foodLog) days.add(e.date);
  for (const w of state.workouts) days.add(w.date);
  for (const [d, v] of Object.entries(state.water)) if (v > 0) days.add(d);
  for (const [d, log] of Object.entries(state.challengeLog)) if (Object.values(log).some((v) => v > 0)) days.add(d);
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue;
    let n = 0;
    let c = d;
    while (days.has(c)) {
      n++;
      c = addDays(c, 1);
    }
    best = Math.max(best, n);
  }
  return best;
}

export function workoutsThisWeek(state: AppState, today: string = dateKey()): number {
  const start = startOfWeek(today, state.settings.weekStartsMonday);
  const days = new Set(state.workouts.filter((w) => w.date >= start && w.date <= today).map((w) => w.date));
  return days.size;
}

export function totalReps(state: AppState, exerciseId: string): number {
  let n = 0;
  for (const w of state.workouts) if (w.exerciseId === exerciseId) n += w.reps ?? 0;
  const ids = new Set(state.challenges.filter((c) => c.exerciseId === exerciseId && c.unit === 'reps').map((c) => c.id));
  if (ids.size > 0) {
    for (const log of Object.values(state.challengeLog)) {
      for (const [cid, v] of Object.entries(log)) if (ids.has(cid)) n += v;
    }
  }
  return n;
}

export function daysMeetingWaterGoal(state: AppState): number {
  return Object.values(state.water).filter((v) => v >= state.goals.waterMl).length;
}

/** Days where kcal eaten was within ±10 % of goal */
export function daysOnCalorieTarget(state: AppState): number {
  const dates = new Set(state.foodLog.map((e) => e.date));
  let n = 0;
  for (const d of dates) {
    const s = daySummary(state, d);
    if (s.eaten >= s.goal * 0.9 && s.eaten <= s.goal * 1.1) n++;
  }
  return n;
}

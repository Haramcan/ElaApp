import { ACHIEVEMENTS, newlyUnlocked } from '../lib/achievements';
import { addDays, dateKey } from '../lib/date';
import { createInitialState, migrateState } from '../lib/defaults';
import { parseOffProduct } from '../lib/openfoodfacts';
import { MAX_SCHEDULED, planNotifications, reminderTimes } from '../lib/reminderPlan';
import { challengeProgress, currentStreak, daySummary, longestStreak, totalReps } from '../lib/selectors';
import { createActions } from '../lib/store';
import type { AppState, FoodItem } from '../lib/types';

function makeStore(initial?: Partial<AppState>) {
  let state: AppState = { ...createInitialState(), onboarded: true, ...initial };
  const actions = createActions((fn) => {
    state = fn(state);
  });
  return { get: () => state, actions };
}

const apple: FoodItem = {
  id: 'builtin:apfel',
  name: 'Apfel',
  per100: { kcal: 54, protein: 0.3, carbs: 12, fat: 0.2 },
  unit: 'g',
  servingSize: 150,
  source: 'builtin',
};

describe('Open Food Facts parsing', () => {
  it('parses a v2 product', () => {
    const f = parseOffProduct({
      code: '4000417025005',
      product_name: 'Schokolade',
      brands: 'Ritter Sport, Foo',
      nutriments: { 'energy-kcal_100g': 496, proteins_100g: 8, carbohydrates_100g: 52, fat_100g: 27, sugars_100g: 40, salt_100g: 0.05 },
      serving_quantity: '16.7',
      nutriscore_grade: 'e',
      quantity: '100 g',
    });
    expect(f).not.toBeNull();
    expect(f!.id).toBe('off:4000417025005');
    expect(f!.brand).toBe('Ritter Sport');
    expect(f!.per100.kcal).toBe(496);
    expect(f!.servingSize).toBe(16.7);
    expect(f!.unit).toBe('g');
    expect(f!.nutriScore).toBe('e');
  });

  it('handles search-a-licious brand arrays, kJ only and liquids', () => {
    const f = parseOffProduct({ code: '1', product_name: 'Saft', brands: ['Marke'], quantity: '1 l', nutriments: { 'energy-kj_100g': 418.4, carbohydrates_100g: 10 } });
    expect(f!.brand).toBe('Marke');
    expect(f!.per100.kcal).toBe(100);
    expect(f!.unit).toBe('ml');
  });

  it('returns null without nutrition data', () => {
    expect(parseOffProduct({ code: '1', product_name: 'X', nutriments: {} })).toBeNull();
    expect(parseOffProduct(null)).toBeNull();
  });
});

describe('store actions', () => {
  it('adds, edits and removes food; tracks recents', () => {
    const s = makeStore();
    const today = dateKey();
    const id = s.actions.addFood(apple, 150, 'snack', today);
    expect(s.get().foodLog).toHaveLength(1);
    expect(s.get().recentFoods[0].id).toBe(apple.id);
    expect(Math.round(daySummary(s.get(), today).eaten)).toBe(81);
    s.actions.updateFoodEntry(id, { amount: 300 });
    expect(Math.round(daySummary(s.get(), today).eaten)).toBe(162);
    s.actions.removeFoodEntry(id);
    expect(s.get().foodLog).toHaveLength(0);
  });

  it('copies meals from yesterday', () => {
    const s = makeStore();
    const today = dateKey();
    const y = addDays(today, -1);
    s.actions.addFood(apple, 100, 'breakfast', y);
    s.actions.addFood(apple, 50, 'breakfast', y);
    s.actions.copyMeal(y, 'breakfast', today, 'breakfast');
    expect(s.get().foodLog.filter((e) => e.date === today)).toHaveLength(2);
  });

  it('clamps water and handles steps', () => {
    const s = makeStore();
    const d = dateKey();
    s.actions.addWater(d, 250);
    s.actions.addWater(d, -1000);
    expect(s.get().water[d]).toBe(0);
    s.actions.addSteps(d, 100);
    s.actions.addSteps(d, -5);
    expect(s.get().steps[d]).toBe(100);
  });

  it('adds exercise bonus calories', () => {
    const s = makeStore();
    const d = dateKey();
    const base = daySummary(s.get(), d).goal;
    s.actions.addWorkout({ date: d, exerciseId: 'running', name: 'Laufen', durationMin: 30, kcal: 300 });
    const sum = daySummary(s.get(), d);
    expect(sum.burned).toBe(300);
    expect(sum.goal).toBe(base + 150); // 50 % default
    s.actions.updateSettings({ eatBackExercise: false });
    expect(daySummary(s.get(), d).goal).toBe(base);
  });

  it('keeps one weight per day and auto-updates calorie goal', () => {
    const s = makeStore();
    const d = dateKey();
    s.actions.addWeight({ date: d, kg: 90 });
    const high = s.get().goals.calories;
    s.actions.addWeight({ date: d, kg: 60 });
    expect(s.get().weights.filter((w) => w.date === d)).toHaveLength(1);
    expect(s.get().goals.calories).toBeLessThan(high);
  });

  it('tracks challenges and push-up totals', () => {
    const s = makeStore();
    const d = dateKey();
    s.actions.addChallengeProgress(d, 'ch_pushups', 6);
    s.actions.addChallengeProgress(d, 'ch_pushups', 4);
    const p = challengeProgress(s.get(), d);
    expect(p.items.find((i) => i.challenge.id === 'ch_pushups')?.complete).toBe(true);
    s.actions.addWorkout({ date: d, exerciseId: 'pushups', name: 'Liegestütze', durationMin: 1, kcal: 5, reps: 20 });
    expect(totalReps(s.get(), 'pushups')).toBe(30);
  });

  it('runs fasting lifecycle', () => {
    const s = makeStore();
    s.actions.startFast(16, Date.now() - 17 * 3600000);
    expect(s.get().fasting.active).toBeDefined();
    s.actions.endFast();
    expect(s.get().fasting.active).toBeUndefined();
    expect(s.get().fasting.history).toHaveLength(1);
    expect(newlyUnlocked(s.get())).toContain('fasting_first');
  });

  it('imports data through migration and resets', () => {
    const s = makeStore();
    s.actions.importData({ onboarded: true, profile: { name: 'Ela' }, foodLog: [], settings: { theme: 'dark' } });
    expect(s.get().profile.name).toBe('Ela');
    expect(s.get().settings.theme).toBe('dark');
    expect(s.get().settings.glassSizeMl).toBe(250);
    s.actions.resetAll();
    expect(s.get().onboarded).toBe(false);
  });
});

describe('migration', () => {
  it('fills defaults and adds new default reminders', () => {
    const m = migrateState({ onboarded: true, reminders: [{ id: 'rem_water', type: 'water', title: 'W', body: 'B', enabled: false }] });
    expect(m.reminders.find((r) => r.id === 'rem_water')?.enabled).toBe(false);
    expect(m.reminders.find((r) => r.id === 'rem_water')?.weekdays).toHaveLength(7);
    expect(m.reminders.some((r) => r.id === 'rem_challenge')).toBe(true);
    expect(migrateState('garbage').onboarded).toBe(false);
  });
});

describe('streaks', () => {
  it('counts consecutive active days', () => {
    const s = makeStore();
    const t = dateKey();
    for (let i = 1; i <= 4; i++) s.actions.addWater(addDays(t, -i), 250);
    expect(currentStreak(s.get(), t)).toBe(4); // today not logged yet keeps streak
    s.actions.addWater(t, 250);
    expect(currentStreak(s.get(), t)).toBe(5);
    s.actions.addWater(addDays(t, -10), 250);
    expect(longestStreak(s.get())).toBe(5);
  });
});

describe('reminder planning', () => {
  it('expands interval reminders', () => {
    const st = createInitialState();
    const water = st.reminders.find((r) => r.id === 'rem_water')!;
    const times = reminderTimes(water);
    expect(times[0]).toEqual({ hour: 9, minute: 0 });
    expect(times[times.length - 1]).toEqual({ hour: 21, minute: 0 });
    expect(times).toHaveLength(7);
  });

  it('stays within the iOS limit and only plans the future', () => {
    const st = { ...createInitialState(), onboarded: true };
    const now = new Date(2026, 10, 22, 8, 0, 0);
    const plan = planNotifications(st, now);
    expect(plan.length).toBeLessThanOrEqual(MAX_SCHEDULED + 1);
    expect(plan.every((p) => p.date.getTime() > now.getTime())).toBe(true);
    expect(plan[plan.length - 1].key).toBe('comeback');
  });

  it('skips smart reminders that are already fulfilled today', () => {
    const now = new Date();
    now.setHours(6, 0, 0, 0);
    const s = makeStore();
    const today = dateKey(now);
    const before = planNotifications(s.get(), now).filter((p) => p.key.startsWith(`rem_water-${today}`)).length;
    expect(before).toBeGreaterThan(0);
    s.actions.addWater(today, 10000);
    s.actions.addFood(apple, 100, 'breakfast', today);
    const plan = planNotifications(s.get(), now);
    expect(plan.filter((p) => p.key.startsWith(`rem_water-${today}`))).toHaveLength(0);
    expect(plan.filter((p) => p.key.startsWith(`rem_breakfast-${today}`))).toHaveLength(0);
    // tomorrow is still planned
    expect(plan.some((p) => p.key.startsWith(`rem_water-${addDays(today, 1)}`))).toBe(true);
  });

  it('personalises the challenge reminder', () => {
    const now = new Date();
    now.setHours(6, 0, 0, 0);
    const s = makeStore();
    const today = dateKey(now);
    const ch = planNotifications(s.get(), now).find((p) => p.key.startsWith(`rem_challenge-${today}`));
    expect(ch?.body).toContain('10× Liegestütze');
    s.actions.setChallengeProgress(today, 'ch_pushups', 10);
    s.actions.setChallengeProgress(today, 'ch_squats', 20);
    s.actions.setChallengeProgress(today, 'ch_plank', 30);
    expect(planNotifications(s.get(), now).some((p) => p.key.startsWith(`rem_challenge-${today}`))).toBe(false);
  });

  it('schedules fasting end', () => {
    const s = makeStore();
    s.actions.startFast(16);
    const plan = planNotifications(s.get(), new Date());
    expect(plan.some((p) => p.key === 'fasting-end')).toBe(true);
  });

  it('plans nothing but nothing breaks with reminders off', () => {
    const s = makeStore();
    s.actions.setAllReminders(false);
    expect(planNotifications(s.get())).toHaveLength(0);
  });
});

describe('achievements', () => {
  it('have unique ids and valid progress', () => {
    const st = createInitialState();
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      const [cur, target] = a.progress(st);
      expect(cur).toBeGreaterThanOrEqual(0);
      expect(target).toBeGreaterThan(0);
    }
  });
});

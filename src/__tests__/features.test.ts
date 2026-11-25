import { sanitize } from '../lib/ai';
import { addDays, dateKey } from '../lib/date';
import { createInitialState } from '../lib/defaults';
import { BUILTIN_FOODS } from '../lib/foods';
import { generatePlan, makeKey } from '../lib/gym';
import { unionDuration } from '../lib/health.types';
import { muscleStats, recommendedMuscles } from '../lib/muscles';
import { decodePlan, encodePlan, extractCode, fromBase64Url, shareMessage, toBase64Url } from '../lib/planShare';
import { recipeToFood, recipeTotals } from '../lib/recipes';
import { planNotifications } from '../lib/reminderPlan';
import { weekReview } from '../lib/review';
import { createActions } from '../lib/store';
import { suggestFood } from '../lib/suggest';
import type { AppState, FoodItem } from '../lib/types';
import { buildLiveProps, buildWidgetProps } from '../lib/widgetData';

function makeStore(init: Partial<AppState> = {}) {
  let state: AppState = { ...createInitialState(), onboarded: true, ...init };
  const actions = createActions((fn) => {
    state = fn(state);
  });
  return { get: () => state, actions };
}

const food = (id: string) => BUILTIN_FOODS.find((f) => f.id === `builtin:${id}`) as FoodItem;

describe('recipes', () => {
  it('computes per-portion values and logs as a food', () => {
    const s = makeStore();
    const id = s.actions.createRecipe('Bowl', { servings: 2 });
    s.actions.addRecipeIngredient(id, food('reis'), 300);
    s.actions.addRecipeIngredient(id, food('haehnchen'), 300);
    const r = s.get().recipes[0];
    const t = recipeTotals(r);
    expect(Math.round(t.kcal)).toBe(Math.round(130 * 3 + 110 * 3));
    const f = recipeToFood(r)!;
    expect(f.servingSize).toBe(300);
    expect(f.source).toBe('recipe');
    // logging one portion equals half of the recipe
    s.actions.addFood(f, f.servingSize!, 'lunch', dateKey());
    const eaten = (f.per100.kcal * f.servingSize!) / 100;
    expect(Math.abs(eaten - t.kcal / 2)).toBeLessThan(2);
    expect(recipeToFood({ ...r, ingredients: [] })).toBeNull();
  });
});

describe('food suggestions', () => {
  it('fits the remaining budget and prefers protein', () => {
    const s = makeStore();
    const today = dateKey();
    const res = suggestFood(s.get(), today, 'dinner');
    expect(res.meals.length).toBeGreaterThan(0);
    for (const m of res.meals) {
      expect(m.items.every((i) => i.food && i.amount > 0)).toBe(true);
      expect(m.kcal).toBeLessThanOrEqual(res.remainingKcal * 1.2);
    }
    expect(res.snacks.length).toBeGreaterThan(0);
  });

  it('suggests only light food when the goal is reached', () => {
    const s = makeStore();
    const today = dateKey();
    s.actions.addFood(food('pizza'), 2000, 'lunch', today);
    const res = suggestFood(s.get(), today, 'dinner');
    expect(res.meals).toHaveLength(0);
    expect(res.message).toMatch(/erreicht/);
  });
});

describe('plan sharing', () => {
  it('round-trips base64url with umlauts and emoji', () => {
    const t = 'Grüße 💪 Übung ß';
    expect(fromBase64Url(toBase64Url(t))).toBe(t);
  });

  it('encodes and decodes a plan including custom machines', () => {
    const s = makeStore();
    s.actions.saveGymExercise({ id: 'gx_1', name: 'Gerät 12 Beinpresse 45°', muscle: 'beine', equipment: 'maschine', custom: true });
    const plan = generatePlan({ goal: 'muskelaufbau', daysPerWeek: 2, level: 'anfaenger', equipment: 'maschinen' }, makeKey);
    plan.days[0].exercises.push({ key: 'k', exerciseId: 'gx_1', sets: 3, repsMin: 8, repsMax: 12, restSec: 90 });
    const code = encodePlan(s.get(), plan, 'Can');
    const msg = shareMessage(code, plan.name, 'Can');
    expect(extractCode(msg)).toBe(code);
    const decoded = decodePlan(msg);
    expect(decoded.from).toBe('Can');
    expect(decoded.plan.days).toHaveLength(2);
    expect(decoded.plan.id).not.toBe(plan.id);
    expect(decoded.customExercises).toHaveLength(1);
    const last = decoded.plan.days[0].exercises[decoded.plan.days[0].exercises.length - 1];
    expect(last.exerciseId).toBe(decoded.customExercises[0].id);
    expect(decoded.plan.days[0].exercises.length).toBe(plan.days[0].exercises.length);
  });

  it('rejects garbage', () => {
    expect(() => decodePlan('hallo')).toThrow();
    expect(() => decodePlan('FITLIFE1:@@@')).toThrow();
  });
});

describe('weekly review', () => {
  it('summarises the week', () => {
    const s = makeStore();
    const today = dateKey();
    s.actions.addFood(food('haehnchen'), 200, 'lunch', today);
    s.actions.addWorkout({ date: today, exerciseId: 'running', name: 'Laufen', durationMin: 30, kcal: 300 });
    s.actions.setSleep(today, { hours: 6, source: 'manual' });
    s.actions.setMood(today, { score: 4 });
    const r = weekReview(s.get(), today, today);
    expect(r.days).toHaveLength(7);
    expect(r.loggedDays).toBe(1);
    expect(r.workouts).toBe(1);
    expect(r.avgSleep).toBe(6);
    expect(r.avgMood).toBe(4);
    expect(r.tips.length).toBeGreaterThan(0);
  });

  it('plans the Sunday notification', () => {
    const s = makeStore();
    const now = new Date(2026, 10, 22, 8, 0); // a Sunday morning
    const plan = planNotifications(s.get(), now);
    expect(plan.some((p) => p.key.startsWith('rem_weekly-2026-11-22') && p.url === '/review')).toBe(true);
  });
});

describe('muscles', () => {
  it('counts sets per muscle and recommends untrained ones', () => {
    const s = makeStore();
    s.actions.startGymSession({ name: 'Brust', exercises: [{ key: 'a', exerciseId: 'chest_press', sets: [1, 2, 3].map(() => ({ weightKg: 40, reps: 10, done: true })) }] });
    s.actions.finishGymSession(80);
    const stats = muscleStats(s.get());
    expect(stats.brust.sets).toBe(3);
    expect(stats.brust.status).toBe('fresh');
    expect(recommendedMuscles(stats)).not.toContain('brust');
    expect(recommendedMuscles(stats)).toContain('beine');
  });
});

describe('health helpers', () => {
  it('merges overlapping sleep intervals', () => {
    const h = 3600000;
    expect(unionDuration([[0, 2 * h], [h, 3 * h], [5 * h, 6 * h]])).toBe(4 * h);
    expect(unionDuration([])).toBe(0);
  });

  it('merges health data without overriding manual sleep', () => {
    const s = makeStore();
    const d = dateKey();
    s.actions.setSleep(d, { hours: 8, source: 'manual' });
    s.actions.mergeHealthData({ steps: { [d]: 9000 }, sleep: { [d]: 6.4, [addDays(d, -1)]: 7.2 }, weights: [{ date: addDays(d, -1), kg: 71.3 }] });
    expect(s.get().steps[d]).toBe(9000);
    expect(s.get().sleep[d].hours).toBe(8);
    expect(s.get().sleep[addDays(d, -1)].source).toBe('health');
    expect(s.get().weights.some((w) => w.kg === 71.3)).toBe(true);
    expect(s.get().healthSyncedAt).toBeDefined();
  });
});

describe('widgets & live status', () => {
  it('builds widget props for every metric', () => {
    const s = makeStore();
    const w = buildWidgetProps(s.get(), dateKey());
    for (const k of ['kcal', 'steps', 'water', 'protein', 'challenge'] as const) {
      expect(w.items[k].value).toBeTruthy();
      expect(w.items[k].progress).toBeGreaterThanOrEqual(0);
      expect(w.items[k].progress).toBeLessThanOrEqual(1);
    }
  });

  it('prioritises gym session, then fasting, then the daily metric', () => {
    const s = makeStore();
    s.actions.updateSettings({ liveMetric: 'steps' });
    expect(buildLiveProps(s.get(), dateKey())?.title).toBe('Schritte');
    s.actions.startFast(16);
    expect(buildLiveProps(s.get(), dateKey())?.countdown).toBe(true);
    s.actions.startGymSession({ name: 'Beine', exercises: [] });
    expect(buildLiveProps(s.get(), dateKey())?.title).toBe('Training läuft');
  });
});

describe('ai result sanitising', () => {
  it('clamps values and drops invalid items', () => {
    const r = sanitize({
      note: 'ok',
      confidence: 'hoch',
      items: [
        { name: 'Pasta', grams: 250, kcal: 380, protein: 13, carbs: 70, fat: 4 },
        { name: 'Nichts', grams: 0, kcal: 10, protein: 0, carbs: 0, fat: 0 },
        { name: 'X', grams: -5, kcal: -1, protein: NaN, carbs: 1e9, fat: 2 },
      ],
    });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].kcal).toBe(380);
  });
});

import { createInitialState, migrateState } from '../lib/defaults';
import {
  estimate1RM,
  exerciseHistory,
  formatSets,
  generatePlan,
  getGymExercise,
  GYM_EXERCISES,
  lastPerformance,
  makeKey,
  newSessionLog,
  nextPlanDay,
  personalRecords,
  sessionLogsFromDay,
  sessionVolume,
  suggestNext,
} from '../lib/gym';
import { createActions } from '../lib/store';
import type { AppState, GymExerciseLog } from '../lib/types';

function makeStore() {
  let state: AppState = { ...createInitialState(), onboarded: true };
  const actions = createActions((fn) => {
    state = fn(state);
  });
  return { get: () => state, actions };
}

const log = (sets: [number | null, number | null, boolean][], extra: Partial<GymExerciseLog> = {}): GymExerciseLog => ({
  key: makeKey(),
  exerciseId: 'leg_press',
  sets: sets.map(([weightKg, reps, done]) => ({ weightKg, reps, done })),
  ...extra,
});

/** runs a complete session with one exercise */
function train(s: ReturnType<typeof makeStore>, exerciseId: string, sets: [number, number][], startOffsetMin = 0) {
  s.actions.startGymSession({ name: 'Test', exercises: [{ ...log(sets.map(([w, r]) => [w, r, true])), exerciseId }] });
  // make sessions chronologically distinct
  const a = s.get().gym.active!;
  (a as { start: number }).start = Date.now() - 60 * 60000 + startOffsetMin * 60000;
  s.actions.finishGymSession(80);
}

describe('gym library', () => {
  it('has unique ids and typical studio machines', () => {
    const ids = new Set(GYM_EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(GYM_EXERCISES.length);
    for (const name of ['Beinpresse', 'Latzug', 'Brustpresse', 'Butterfly', 'Beinstrecker', 'Abduktoren-Maschine']) {
      expect(GYM_EXERCISES.some((e) => e.name === name)).toBe(true);
    }
  });
});

describe('progression', () => {
  it('suggests the first weight', () => {
    expect(suggestNext(undefined, { step: 2.5 }).kind).toBe('first');
  });
  it('increases when all sets reach the top of the rep range', () => {
    const s = suggestNext(log([[15, 12, true], [15, 12, true], [15, 12, true]]), { repsMin: 8, repsMax: 12, step: 2.5 });
    expect(s.kind).toBe('increase');
    expect(s.weightKg).toBe(17.5);
  });
  it('repeats when reps are in range', () => {
    const s = suggestNext(log([[15, 12, true], [15, 10, true], [15, 9, true]]), { repsMin: 8, repsMax: 12, step: 2.5 });
    expect(s.kind).toBe('repeat');
    expect(s.weightKg).toBe(15);
  });
  it('reduces when sets clearly failed', () => {
    const s = suggestNext(log([[20, 5, true], [20, 4, true]]), { repsMin: 8, repsMax: 12, step: 2.5 });
    expect(s.kind).toBe('reduce');
    expect(s.weightKg).toBe(17.5);
  });
  it('ignores unfinished sets', () => {
    expect(suggestNext(log([[15, 12, false]]), { step: 2.5 }).kind).toBe('first');
  });
  it('estimates 1RM and formats sets', () => {
    expect(estimate1RM(100, 10)).toBe(133.3);
    expect(estimate1RM(100, 1)).toBe(100);
    expect(formatSets(log([[15, 12, true], [15, 10, true], [17.5, 8, true]]), (kg) => `${kg} kg`)).toBe('15 kg × 12, 10 · 17.5 kg × 8');
  });
});

describe('gym sessions in the store', () => {
  it('saves a finished session with only completed sets and logs an activity', () => {
    const s = makeStore();
    s.actions.startGymSession({ name: 'Beine', exercises: [log([[15, 12, true], [15, null, false]]), { ...log([[null, null, false]]), exerciseId: 'leg_extension' }] });
    expect(s.get().gym.active).toBeDefined();
    // a second start is ignored while one is running
    s.actions.startGymSession({ name: 'Other', exercises: [] });
    expect(s.get().gym.active?.name).toBe('Beine');
    s.actions.finishGymSession(80);
    const g = s.get().gym;
    expect(g.active).toBeUndefined();
    expect(g.sessions).toHaveLength(1);
    expect(g.sessions[0].exercises).toHaveLength(1);
    expect(g.sessions[0].exercises[0].sets).toHaveLength(1);
    expect(sessionVolume(g.sessions[0])).toBe(180);
    const w = s.get().workouts.find((x) => x.id === g.sessions[0].workoutId);
    expect(w?.kcal).toBeGreaterThan(0);
    s.actions.deleteGymSession(g.sessions[0].id);
    expect(s.get().gym.sessions).toHaveLength(0);
    expect(s.get().workouts).toHaveLength(0);
  });

  it('discards a session without completed sets', () => {
    const s = makeStore();
    s.actions.startGymSession({ name: 'X', exercises: [log([[15, 10, false]])] });
    s.actions.finishGymSession(80);
    expect(s.get().gym.sessions).toHaveLength(0);
    expect(s.get().gym.active).toBeUndefined();
  });

  it('shows last time and pre-fills the next session with a higher weight', () => {
    const s = makeStore();
    train(s, 'leg_press', [[15, 12], [15, 12], [15, 12]]);
    const last = lastPerformance(s.get(), 'leg_press');
    expect(last?.log.sets.map((x) => x.weightKg)).toEqual([15, 15, 15]);
    const next = newSessionLog(s.get(), 'leg_press', { repsMin: 8, repsMax: 12, sets: 3 });
    expect(next.sets).toHaveLength(3);
    expect(next.sets.every((x) => x.weightKg === 17.5 && !x.done)).toBe(true);
  });

  it('detects personal records chronologically', () => {
    const s = makeStore();
    train(s, 'lat_pulldown', [[40, 10]], 0);
    train(s, 'lat_pulldown', [[45, 8]], 10);
    const sessions = [...s.get().gym.sessions].sort((a, b) => a.start - b.start);
    expect(personalRecords(s.get(), sessions[0])).toHaveLength(0); // first time is no record
    const pr = personalRecords(s.get(), sessions[1]);
    expect(pr).toEqual([{ exerciseId: 'lat_pulldown', weightKg: 45, previous: 40 }]);
    expect(exerciseHistory(s.get(), 'lat_pulldown')).toHaveLength(2);
  });

  it('edits active logs and machine notes', () => {
    const s = makeStore();
    s.actions.startGymSession({ name: 'X', exercises: [log([[10, 10, false]])] });
    const key = s.get().gym.active!.exercises[0].key;
    s.actions.updateActiveLog(key, (l) => ({ ...l, sets: [...l.sets, { weightKg: 12.5, reps: 8, done: true }] }));
    expect(s.get().gym.active!.exercises[0].sets).toHaveLength(2);
    s.actions.setGymNote('leg_press', 'Sitz 4');
    expect(s.get().gym.notes.leg_press).toBe('Sitz 4');
    s.actions.setGymNote('leg_press', '');
    expect(s.get().gym.notes.leg_press).toBeUndefined();
    s.actions.removeActiveLog(key);
    expect(s.get().gym.active!.exercises).toHaveLength(0);
  });

  it('supports custom machines', () => {
    const s = makeStore();
    s.actions.saveGymExercise({ id: 'gx_1', name: 'Gerät 12', muscle: 'beine', equipment: 'maschine', custom: true });
    expect(getGymExercise(s.get(), 'gx_1')?.name).toBe('Gerät 12');
    s.actions.deleteGymExercise('gx_1');
    expect(getGymExercise(s.get(), 'gx_1')).toBeUndefined();
  });
});

describe('training plans', () => {
  it('generates valid plans for every combination', () => {
    for (const goal of ['muskelaufbau', 'kraft', 'abnehmen', 'fitness'] as const)
      for (const days of [2, 3, 4, 5, 6])
        for (const level of ['anfaenger', 'fortgeschritten'] as const)
          for (const equipment of ['maschinen', 'freihantel', 'gemischt'] as const) {
            const p = generatePlan({ goal, daysPerWeek: days, level, equipment }, makeKey);
            expect(p.days).toHaveLength(days);
            for (const d of p.days) {
              expect(d.exercises.length).toBeGreaterThanOrEqual(5);
              expect(new Set(d.exercises.map((e) => e.exerciseId)).size).toBe(d.exercises.length);
              for (const e of d.exercises) {
                expect(GYM_EXERCISES.some((x) => x.id === e.exerciseId)).toBe(true);
                expect(e.repsMin).toBeLessThanOrEqual(e.repsMax);
              }
            }
          }
  });

  it('prefers machines for machine users and uses strength rep ranges', () => {
    const p = generatePlan({ goal: 'kraft', daysPerWeek: 2, level: 'anfaenger', equipment: 'maschinen' }, makeKey);
    const first = p.days[0].exercises[0];
    expect(GYM_EXERCISES.find((x) => x.id === first.exerciseId)?.equipment).toBe('maschine');
    expect(first.repsMin).toBe(4);
  });

  it('rotates through plan days', () => {
    const s = makeStore();
    const plan = generatePlan({ goal: 'muskelaufbau', daysPerWeek: 3, level: 'anfaenger', equipment: 'maschinen' }, makeKey);
    s.actions.savePlan(plan, true);
    expect(s.get().gym.activePlanId).toBe(plan.id);
    expect(nextPlanDay(s.get(), plan)?.id).toBe(plan.days[0].id);
    const day = plan.days[0];
    s.actions.startGymSession({ name: day.name, planId: plan.id, dayId: day.id, exercises: sessionLogsFromDay(s.get(), day).map((l) => ({ ...l, sets: l.sets.map((x) => ({ ...x, weightKg: 20, reps: 10, done: true })) })) });
    s.actions.finishGymSession(80);
    expect(nextPlanDay(s.get(), plan)?.id).toBe(plan.days[1].id);
  });

  it('creates and edits own plans', () => {
    const s = makeStore();
    const id = s.actions.createPlan('Mein Plan');
    const dayId = s.get().gym.plans[0].days[0].id;
    s.actions.addPlanExercise(id, dayId, 'chest_press');
    s.actions.addPlanDay(id, 'Tag B');
    expect(s.get().gym.plans[0].days).toHaveLength(2);
    expect(s.get().gym.plans[0].days[0].exercises[0].exerciseId).toBe('chest_press');
    s.actions.deletePlan(id);
    expect(s.get().gym.plans).toHaveLength(0);
    expect(s.get().gym.activePlanId).toBeUndefined();
  });

  it('migrates old saves without gym data', () => {
    const m = migrateState({ onboarded: true, profile: {}, foodLog: [] });
    expect(m.gym.sessions).toEqual([]);
    expect(m.settings.gymWeightStep).toBe(2.5);
  });
});

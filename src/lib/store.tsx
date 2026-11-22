import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';

import { calorieGoal, metKcal } from './calc';
import { completedSets } from './gym';
import { createInitialState, goalsFromProfile, migrateState } from './defaults';
import { latestWeightKg } from './selectors';
import type {
  AppState,
  Challenge,
  FoodEntry,
  FoodItem,
  Goals,
  GymExercise,
  GymExerciseLog,
  GymSession,
  PlanDay,
  PlanExercise,
  TrainingPlan,
  MealType,
  Profile,
  Reminder,
  Settings,
  WeightEntry,
  WorkoutEntry,
} from './types';

export const STORAGE_KEY = 'fitapp-state-v1';
const MAX_RECENT = 50;

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function pushRecent(list: FoodItem[], food: FoodItem): FoodItem[] {
  if (food.source === 'quick') return list;
  return [food, ...list.filter((f) => f.id !== food.id)].slice(0, MAX_RECENT);
}

function withAutoGoals(s: AppState): AppState {
  if (!s.goals.autoCalories) return s;
  const cal = calorieGoal(s.profile, latestWeightKg(s));
  if (cal === s.goals.calories) return s;
  return { ...s, goals: { ...s.goals, calories: cal } };
}

export function createActions(set: (fn: (s: AppState) => AppState) => void) {
  return {
    completeOnboarding(profile: Profile, goals: Goals) {
      set((s) => ({
        ...s,
        onboarded: true,
        profile,
        goals,
        weights:
          s.weights.length > 0
            ? s.weights
            : [{ id: uid('w_'), date: todayKey(), kg: profile.startWeightKg, createdAt: Date.now() }],
      }));
    },
    updateProfile(patch: Partial<Profile>) {
      set((s) => withAutoGoals({ ...s, profile: { ...s.profile, ...patch } }));
    },
    updateGoals(patch: Partial<Goals>) {
      set((s) => withAutoGoals({ ...s, goals: { ...s.goals, ...patch } }));
    },
    recalcGoals() {
      set((s) => ({ ...s, goals: goalsFromProfile(s.profile, latestWeightKg(s), { ...s.goals, autoCalories: true }) }));
    },
    updateSettings(patch: Partial<Settings>) {
      set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    },

    // ---------- food ----------
    addFood(food: FoodItem, amount: number, meal: MealType, date: string): string {
      const id = uid('f_');
      const entry: FoodEntry = { id, date, meal, food, amount, createdAt: Date.now() };
      set((s) => ({ ...s, foodLog: [...s.foodLog, entry], recentFoods: pushRecent(s.recentFoods, food) }));
      return id;
    },
    updateFoodEntry(id: string, patch: Partial<Pick<FoodEntry, 'amount' | 'meal' | 'date'>>) {
      set((s) => ({ ...s, foodLog: s.foodLog.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    },
    removeFoodEntry(id: string) {
      set((s) => ({ ...s, foodLog: s.foodLog.filter((e) => e.id !== id) }));
    },
    restoreFoodEntry(entry: FoodEntry) {
      set((s) => ({ ...s, foodLog: [...s.foodLog.filter((e) => e.id !== entry.id), entry] }));
    },
    copyMeal(fromDate: string, fromMeal: MealType, toDate: string, toMeal: MealType) {
      set((s) => {
        const src = s.foodLog.filter((e) => e.date === fromDate && e.meal === fromMeal);
        const copies = src.map((e, i) => ({
          ...e,
          id: uid('f_'),
          date: toDate,
          meal: toMeal,
          createdAt: Date.now() + i,
        }));
        return { ...s, foodLog: [...s.foodLog, ...copies] };
      });
    },
    saveCustomFood(food: FoodItem) {
      set((s) => {
        const exists = s.customFoods.some((f) => f.id === food.id);
        return {
          ...s,
          customFoods: exists ? s.customFoods.map((f) => (f.id === food.id ? food : f)) : [food, ...s.customFoods],
          favorites: s.favorites.map((f) => (f.id === food.id ? food : f)),
          recentFoods: s.recentFoods.map((f) => (f.id === food.id ? food : f)),
        };
      });
    },
    deleteCustomFood(id: string) {
      set((s) => ({
        ...s,
        customFoods: s.customFoods.filter((f) => f.id !== id),
        favorites: s.favorites.filter((f) => f.id !== id),
        recentFoods: s.recentFoods.filter((f) => f.id !== id),
      }));
    },
    toggleFavorite(food: FoodItem) {
      set((s) => {
        const isFav = s.favorites.some((f) => f.id === food.id);
        return { ...s, favorites: isFav ? s.favorites.filter((f) => f.id !== food.id) : [food, ...s.favorites] };
      });
    },
    clearRecent() {
      set((s) => ({ ...s, recentFoods: [] }));
    },

    // ---------- water / steps ----------
    addWater(date: string, ml: number) {
      set((s) => ({ ...s, water: { ...s.water, [date]: Math.max(0, Math.min(20000, (s.water[date] ?? 0) + ml)) } }));
    },
    setWater(date: string, ml: number) {
      set((s) => ({ ...s, water: { ...s.water, [date]: Math.max(0, Math.min(20000, ml)) } }));
    },
    setSteps(date: string, steps: number) {
      set((s) => ({ ...s, steps: { ...s.steps, [date]: Math.max(0, Math.round(steps)) } }));
    },
    addSteps(date: string, delta: number) {
      if (delta <= 0) return;
      set((s) => ({ ...s, steps: { ...s.steps, [date]: (s.steps[date] ?? 0) + Math.round(delta) } }));
    },

    // ---------- workouts ----------
    addWorkout(w: Omit<WorkoutEntry, 'id' | 'createdAt'>): string {
      const id = uid('wo_');
      set((s) => ({ ...s, workouts: [...s.workouts, { ...w, id, createdAt: Date.now() }] }));
      return id;
    },
    removeWorkout(id: string) {
      set((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
    },

    // ---------- weight ----------
    addWeight(entry: Omit<WeightEntry, 'id' | 'createdAt'>) {
      set((s) =>
        withAutoGoals({
          ...s,
          // one entry per day – replace an existing one
          weights: [...s.weights.filter((w) => w.date !== entry.date), { ...entry, id: uid('w_'), createdAt: Date.now() }],
        }),
      );
    },
    removeWeight(id: string) {
      set((s) => withAutoGoals({ ...s, weights: s.weights.filter((w) => w.id !== id) }));
    },

    // ---------- challenges ----------
    addChallengeProgress(date: string, challengeId: string, amount: number) {
      set((s) => {
        const day = { ...(s.challengeLog[date] ?? {}) };
        day[challengeId] = Math.max(0, (day[challengeId] ?? 0) + amount);
        return { ...s, challengeLog: { ...s.challengeLog, [date]: day } };
      });
    },
    setChallengeProgress(date: string, challengeId: string, value: number) {
      set((s) => {
        const day = { ...(s.challengeLog[date] ?? {}) };
        day[challengeId] = Math.max(0, value);
        return { ...s, challengeLog: { ...s.challengeLog, [date]: day } };
      });
    },
    updateChallenge(id: string, patch: Partial<Challenge>) {
      set((s) => ({ ...s, challenges: s.challenges.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    },
    addChallenge(c: Omit<Challenge, 'id'>) {
      set((s) => ({ ...s, challenges: [...s.challenges, { ...c, id: uid('ch_') }] }));
    },
    removeChallenge(id: string) {
      set((s) => ({ ...s, challenges: s.challenges.filter((c) => c.id !== id) }));
    },

    // ---------- reminders ----------
    updateReminder(id: string, patch: Partial<Reminder>) {
      set((s) => ({ ...s, reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    },
    addReminder(r: Omit<Reminder, 'id'>): string {
      const id = uid('rem_');
      set((s) => ({ ...s, reminders: [...s.reminders, { ...r, id }] }));
      return id;
    },
    removeReminder(id: string) {
      set((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
    },
    setAllReminders(enabled: boolean) {
      set((s) => ({ ...s, reminders: s.reminders.map((r) => ({ ...r, enabled })) }));
    },

    // ---------- fasting ----------
    startFast(targetHours: number, start: number = Date.now()) {
      set((s) => ({ ...s, fasting: { ...s.fasting, targetHours, active: { id: uid('fa_'), start, targetHours } } }));
    },
    endFast(end: number = Date.now()) {
      set((s) => {
        const a = s.fasting.active;
        if (!a) return s;
        return { ...s, fasting: { ...s.fasting, active: undefined, history: [{ ...a, end }, ...s.fasting.history].slice(0, 200) } };
      });
    },
    cancelFast() {
      set((s) => ({ ...s, fasting: { ...s.fasting, active: undefined } }));
    },
    updateActiveFast(patch: { start?: number; targetHours?: number }) {
      set((s) => {
        if (!s.fasting.active) return s;
        return { ...s, fasting: { ...s.fasting, active: { ...s.fasting.active, ...patch } } };
      });
    },
    setFastTarget(targetHours: number) {
      set((s) => ({ ...s, fasting: { ...s.fasting, targetHours } }));
    },
    removeFast(id: string) {
      set((s) => ({ ...s, fasting: { ...s.fasting, history: s.fasting.history.filter((f) => f.id !== id) } }));
    },

    // ---------- gym ----------
    startGymSession(init: { name: string; planId?: string; dayId?: string; exercises: GymExerciseLog[] }): string {
      const id = uid('gs_');
      const now = Date.now();
      set((s) => {
        if (s.gym.active) return s;
        const session: GymSession = { id, date: todayKey(), start: now, ...init };
        return { ...s, gym: { ...s.gym, active: session } };
      });
      return id;
    },
    updateActiveSession(patch: Partial<Pick<GymSession, 'name' | 'note'>>) {
      set((s) => (s.gym.active ? { ...s, gym: { ...s.gym, active: { ...s.gym.active, ...patch } } } : s));
    },
    addActiveLog(log: GymExerciseLog) {
      set((s) => (s.gym.active ? { ...s, gym: { ...s.gym, active: { ...s.gym.active, exercises: [...s.gym.active.exercises, log] } } } : s));
    },
    updateActiveLog(key: string, fn: (log: GymExerciseLog) => GymExerciseLog) {
      set((s) => {
        const a = s.gym.active;
        if (!a) return s;
        return { ...s, gym: { ...s.gym, active: { ...a, exercises: a.exercises.map((l) => (l.key === key ? fn(l) : l)) } } };
      });
    },
    removeActiveLog(key: string) {
      set((s) => {
        const a = s.gym.active;
        if (!a) return s;
        return { ...s, gym: { ...s.gym, active: { ...a, exercises: a.exercises.filter((l) => l.key !== key) } } };
      });
    },
    moveActiveLog(key: string, dir: -1 | 1) {
      set((s) => {
        const a = s.gym.active;
        if (!a) return s;
        const list = [...a.exercises];
        const i = list.findIndex((l) => l.key === key);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return s;
        [list[i], list[j]] = [list[j], list[i]];
        return { ...s, gym: { ...s.gym, active: { ...a, exercises: list } } };
      });
    },
    /** Saves the active session (only exercises with completed sets) and logs it as an activity */
    finishGymSession(bodyWeightKg: number) {
      const workoutId = uid('wo_');
      set((s) => {
        const a = s.gym.active;
        if (!a) return s;
        const end = Date.now();
        const exercises = a.exercises
          .map((l) => ({ ...l, sets: l.sets.filter((x) => x.done && (x.reps ?? 0) > 0) }))
          .filter((l) => completedSets(l).length > 0);
        if (exercises.length === 0) return { ...s, gym: { ...s.gym, active: undefined } };
        const minutes = Math.max(5, Math.min(240, Math.round((end - a.start) / 60000)));
        const session: GymSession = { ...a, end, exercises, workoutId };
        return {
          ...s,
          gym: { ...s.gym, active: undefined, sessions: [...s.gym.sessions, session] },
          workouts: [
            ...s.workouts,
            {
              id: workoutId,
              date: a.date,
              exerciseId: 'weights',
              name: `Krafttraining: ${a.name}`,
              durationMin: minutes,
              kcal: metKcal(5, bodyWeightKg, minutes),
              sets: exercises.reduce((n, l) => n + l.sets.length, 0),
              createdAt: end,
            },
          ],
        };
      });
    },
    discardGymSession() {
      set((s) => ({ ...s, gym: { ...s.gym, active: undefined } }));
    },
    deleteGymSession(id: string) {
      set((s) => {
        const sess = s.gym.sessions.find((x) => x.id === id);
        return {
          ...s,
          gym: { ...s.gym, sessions: s.gym.sessions.filter((x) => x.id !== id) },
          workouts: sess?.workoutId ? s.workouts.filter((w) => w.id !== sess.workoutId) : s.workouts,
        };
      });
    },
    saveGymExercise(ex: GymExercise) {
      set((s) => {
        const exists = s.gym.customExercises.some((e) => e.id === ex.id);
        const customExercises = exists ? s.gym.customExercises.map((e) => (e.id === ex.id ? ex : e)) : [ex, ...s.gym.customExercises];
        return { ...s, gym: { ...s.gym, customExercises } };
      });
    },
    deleteGymExercise(id: string) {
      set((s) => ({ ...s, gym: { ...s.gym, customExercises: s.gym.customExercises.filter((e) => e.id !== id) } }));
    },
    setGymNote(exerciseId: string, note: string) {
      set((s) => {
        const notes = { ...s.gym.notes };
        if (note.trim()) notes[exerciseId] = note;
        else delete notes[exerciseId];
        return { ...s, gym: { ...s.gym, notes } };
      });
    },

    // ---------- training plans ----------
    savePlan(plan: TrainingPlan, makeActive = false) {
      set((s) => {
        const exists = s.gym.plans.some((p) => p.id === plan.id);
        const plans = exists ? s.gym.plans.map((p) => (p.id === plan.id ? plan : p)) : [...s.gym.plans, plan];
        return { ...s, gym: { ...s.gym, plans, activePlanId: makeActive || !s.gym.activePlanId ? plan.id : s.gym.activePlanId } };
      });
    },
    createPlan(name: string): string {
      const id = uid('plan_');
      const dayId = uid('day_');
      set((s) => ({
        ...s,
        gym: {
          ...s.gym,
          plans: [...s.gym.plans, { id, name, days: [{ id: dayId, name: 'Tag A', exercises: [] }], createdAt: Date.now() }],
          activePlanId: s.gym.activePlanId ?? id,
        },
      }));
      return id;
    },
    deletePlan(id: string) {
      set((s) => {
        const plans = s.gym.plans.filter((p) => p.id !== id);
        return { ...s, gym: { ...s.gym, plans, activePlanId: s.gym.activePlanId === id ? plans[0]?.id : s.gym.activePlanId } };
      });
    },
    setActivePlan(id: string | undefined) {
      set((s) => ({ ...s, gym: { ...s.gym, activePlanId: id } }));
    },
    updatePlan(id: string, fn: (p: TrainingPlan) => TrainingPlan) {
      set((s) => ({ ...s, gym: { ...s.gym, plans: s.gym.plans.map((p) => (p.id === id ? fn(p) : p)) } }));
    },
    addPlanDay(planId: string, name: string): string {
      const dayId = uid('day_');
      set((s) => ({
        ...s,
        gym: { ...s.gym, plans: s.gym.plans.map((p) => (p.id === planId ? { ...p, days: [...p.days, { id: dayId, name, exercises: [] }] } : p)) },
      }));
      return dayId;
    },
    updatePlanDay(planId: string, dayId: string, fn: (d: PlanDay) => PlanDay) {
      set((s) => ({
        ...s,
        gym: { ...s.gym, plans: s.gym.plans.map((p) => (p.id === planId ? { ...p, days: p.days.map((d) => (d.id === dayId ? fn(d) : d)) } : p)) },
      }));
    },
    removePlanDay(planId: string, dayId: string) {
      set((s) => ({
        ...s,
        gym: { ...s.gym, plans: s.gym.plans.map((p) => (p.id === planId ? { ...p, days: p.days.filter((d) => d.id !== dayId) } : p)) },
      }));
    },
    addPlanExercise(planId: string, dayId: string, exerciseId: string, defaults: Partial<PlanExercise> = {}) {
      const ex: PlanExercise = { key: uid('pe_'), exerciseId, sets: 3, repsMin: 8, repsMax: 12, restSec: 90, ...defaults };
      set((s) => ({
        ...s,
        gym: {
          ...s.gym,
          plans: s.gym.plans.map((p) =>
            p.id === planId ? { ...p, days: p.days.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, ex] } : d)) } : p,
          ),
        },
      }));
    },

    // ---------- misc ----------
    incrementStat(key: keyof AppState['stats'], by = 1) {
      set((s) => ({ ...s, stats: { ...s.stats, [key]: (s.stats[key] ?? 0) + by } }));
    },
    unlockAchievements(ids: string[]) {
      if (ids.length === 0) return;
      set((s) => {
        const next = { ...s.unlockedAchievements };
        for (const id of ids) if (!next[id]) next[id] = Date.now();
        return { ...s, unlockedAchievements: next };
      });
    },
    importData(raw: unknown) {
      const next = migrateState(raw);
      set(() => next);
    },
    resetAll() {
      set(() => createInitialState());
    },
  };
}

export type Actions = ReturnType<typeof createActions>;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface StoreValue {
  state: AppState;
  actions: Actions;
  ready: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = migrateState(JSON.parse(raw));
          stateRef.current = parsed;
          setState(parsed);
        }
      } catch (e) {
        console.warn('Daten konnten nicht geladen werden', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
    } catch (e) {
      console.warn('Daten konnten nicht gespeichert werden', e);
    }
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 300);
  }, [state, ready, persist]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s !== 'active' && ready) void persist();
    });
    return () => sub.remove();
  }, [ready, persist]);

  const set = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const actions = useMemo(() => createActions(set), [set]);
  const value = useMemo(() => ({ state, actions, ready }), [state, actions, ready]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

import { calorieGoal, defaultMacroSplit, waterGoalMl } from './calc';
import type { AppState, Challenge, Goals, Profile, Reminder, Settings } from './types';

export const STATE_VERSION = 1;

export const DEFAULT_PROFILE: Profile = {
  name: '',
  sex: 'female',
  birthYear: new Date().getFullYear() - 30,
  heightCm: 170,
  startWeightKg: 70,
  targetWeightKg: 65,
  activity: 'light',
  goal: 'lose',
  weeklyRateKg: 0.5,
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  energyUnit: 'kcal',
  weightUnit: 'kg',
  glassSizeMl: 250,
  bottleSizeMl: 500,
  haptics: true,
  eatBackExercise: true,
  eatBackPercent: 50,
  weekStartsMonday: true,
  showNutriScore: true,
  usePedometer: true,
  workoutRestSec: 10,
  workoutWorkSec: 30,
  countdownBeforeWorkout: true,
  keepScreenOn: true,
  gymWeightStep: 2.5,
  gymRestSec: 90,
  gymAutoRest: true,
  healthSync: false,
  widgetMetric: 'overview',
  liveStatus: false,
  liveMetric: 'steps',
};

export function goalsFromProfile(profile: Profile, weightKg: number, prev?: Partial<Goals>): Goals {
  const split = defaultMacroSplit(profile.goal);
  return {
    autoCalories: prev?.autoCalories ?? true,
    calories: calorieGoal(profile, weightKg),
    proteinPct: prev?.proteinPct ?? split.proteinPct,
    carbsPct: prev?.carbsPct ?? split.carbsPct,
    fatPct: prev?.fatPct ?? split.fatPct,
    waterMl: prev?.waterMl ?? waterGoalMl(weightKg),
    steps: prev?.steps ?? 8000,
    fiberG: prev?.fiberG ?? 30,
    sugarMaxG: prev?.sugarMaxG ?? 50,
    workoutsPerWeek: prev?.workoutsPerWeek ?? 3,
  };
}

export const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'ch_pushups', exerciseId: 'pushups', name: 'Liegestütze', target: 10, unit: 'reps', enabled: true },
  { id: 'ch_squats', exerciseId: 'squats', name: 'Kniebeugen', target: 20, unit: 'reps', enabled: true },
  { id: 'ch_plank', exerciseId: 'plank', name: 'Plank', target: 30, unit: 'sec', enabled: true },
  { id: 'ch_situps', exerciseId: 'situps', name: 'Sit-ups', target: 15, unit: 'reps', enabled: false },
  { id: 'ch_jj', exerciseId: 'jumping_jacks', name: 'Hampelmann', target: 30, unit: 'reps', enabled: false },
];

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

function reminder(r: Partial<Reminder> & Pick<Reminder, 'id' | 'type' | 'title' | 'body'>): Reminder {
  return {
    enabled: true,
    mode: 'times',
    times: [{ hour: 9, minute: 0 }],
    weekdays: ALL_DAYS,
    intervalMin: 120,
    startTime: { hour: 8, minute: 0 },
    endTime: { hour: 20, minute: 0 },
    smart: true,
    ...r,
  };
}

export const DEFAULT_REMINDERS: Reminder[] = [
  reminder({
    id: 'rem_water',
    type: 'water',
    title: 'Zeit zu trinken 💧',
    body: 'Ein Glas Wasser bringt dich deinem Tagesziel näher.',
    mode: 'interval',
    intervalMin: 120,
    startTime: { hour: 9, minute: 0 },
    endTime: { hour: 21, minute: 0 },
  }),
  reminder({
    id: 'rem_breakfast',
    type: 'meal',
    meal: 'breakfast',
    title: 'Frühstück eintragen 🍳',
    body: 'Hast du schon gefrühstückt? Trag es gleich ein.',
    times: [{ hour: 9, minute: 30 }],
  }),
  reminder({
    id: 'rem_lunch',
    type: 'meal',
    meal: 'lunch',
    title: 'Mittagessen eintragen 🥗',
    body: 'Vergiss nicht, dein Mittagessen zu erfassen.',
    times: [{ hour: 13, minute: 30 }],
  }),
  reminder({
    id: 'rem_dinner',
    type: 'meal',
    meal: 'dinner',
    title: 'Abendessen eintragen 🍽️',
    body: 'Trag dein Abendessen ein, um den Tag abzuschließen.',
    times: [{ hour: 19, minute: 30 }],
  }),
  reminder({
    id: 'rem_challenge',
    type: 'challenge',
    title: 'Tages-Challenge 💪',
    body: 'Zeit für deine Challenge – z. B. 10 Liegestütze! Dauert nur eine Minute.',
    times: [
      { hour: 11, minute: 0 },
      { hour: 17, minute: 0 },
    ],
  }),
  reminder({
    id: 'rem_workout',
    type: 'workout',
    title: 'Training steht an 🏋️',
    body: 'Heute ist Trainingstag – schon 15 Minuten machen einen Unterschied.',
    times: [{ hour: 18, minute: 0 }],
    weekdays: [1, 3, 5],
  }),
  reminder({
    id: 'rem_weight',
    type: 'weight',
    title: 'Wiegen ⚖️',
    body: 'Am besten morgens nüchtern wiegen und Gewicht eintragen.',
    times: [{ hour: 7, minute: 30 }],
    weekdays: [1],
  }),
  reminder({
    id: 'rem_goalcheck',
    type: 'goalcheck',
    title: 'Tagesziele-Check ✅',
    body: 'Schau nach, ob du heute deine Ziele erreicht hast.',
    times: [{ hour: 20, minute: 30 }],
  }),
  reminder({
    id: 'rem_weekly',
    type: 'weekly',
    title: 'Dein Wochenrückblick 📊',
    body: 'Schau dir an, wie deine Woche gelaufen ist – und was du nächste Woche besser machen kannst.',
    times: [{ hour: 19, minute: 0 }],
    weekdays: [7],
  }),
  reminder({
    id: 'rem_fasting',
    type: 'fasting',
    title: 'Fasten',
    body: 'Erinnerung zum Fastenende.',
    enabled: true,
    smart: true,
    times: [],
  }),
];

export function createInitialState(): AppState {
  return {
    version: STATE_VERSION,
    onboarded: false,
    profile: DEFAULT_PROFILE,
    goals: goalsFromProfile(DEFAULT_PROFILE, DEFAULT_PROFILE.startWeightKg),
    settings: DEFAULT_SETTINGS,
    foodLog: [],
    customFoods: [],
    recentFoods: [],
    favorites: [],
    water: {},
    steps: {},
    workouts: [],
    weights: [],
    challenges: DEFAULT_CHALLENGES,
    challengeLog: {},
    reminders: DEFAULT_REMINDERS,
    fasting: { targetHours: 16, history: [] },
    stats: { scans: 0, guidedWorkouts: 0 },
    unlockedAchievements: {},
    gym: { sessions: [], plans: [], customExercises: [], notes: {} },
    recipes: [],
    sleep: {},
    mood: {},
    photos: [],
  };
}

/** Merges persisted data with defaults so new fields added in updates always exist */
export function migrateState(raw: unknown): AppState {
  const base = createInitialState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
  const obj = <T extends object>(v: unknown, fallback: T): T =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : fallback;

  // keep user reminders, but add any new default reminders that didn't exist yet
  const reminders = arr<Reminder>(r.reminders, base.reminders);
  for (const def of DEFAULT_REMINDERS) {
    if (!reminders.some((x) => x.id === def.id)) reminders.push(def);
  }

  return {
    ...base,
    version: STATE_VERSION,
    onboarded: !!r.onboarded,
    profile: { ...base.profile, ...obj(r.profile, {}) },
    goals: { ...base.goals, ...obj(r.goals, {}) },
    settings: { ...base.settings, ...obj(r.settings, {}) },
    foodLog: arr(r.foodLog, []),
    customFoods: arr(r.customFoods, []),
    recentFoods: arr(r.recentFoods, []),
    favorites: arr(r.favorites, []),
    water: obj(r.water, {}),
    steps: obj(r.steps, {}),
    workouts: arr(r.workouts, []),
    weights: arr(r.weights, []),
    challenges: arr(r.challenges, base.challenges),
    challengeLog: obj(r.challengeLog, {}),
    reminders: reminders.map((x) => ({ ...reminder({ id: x.id, type: x.type, title: x.title, body: x.body }), ...x })),
    fasting: { ...base.fasting, ...obj(r.fasting, base.fasting), history: arr(r.fasting?.history, []) },
    stats: { ...base.stats, ...obj(r.stats, base.stats) },
    unlockedAchievements: obj(r.unlockedAchievements, {}),
    gym: (() => {
      const g = obj<Partial<AppState['gym']>>(r.gym, {});
      return {
        sessions: arr(g.sessions, []),
        active: g.active && typeof g.active === 'object' ? g.active : undefined,
        plans: arr(g.plans, []),
        activePlanId: typeof g.activePlanId === 'string' ? g.activePlanId : undefined,
        customExercises: arr(g.customExercises, []),
        notes: obj(g.notes, {}),
      };
    })(),
    recipes: arr(r.recipes, []),
    sleep: obj(r.sleep, {}),
    mood: obj(r.mood, {}),
    photos: arr(r.photos, []),
    healthSyncedAt: typeof r.healthSyncedAt === 'number' ? r.healthSyncedAt : undefined,
  };
}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ThemeMode = 'system' | 'light' | 'dark';
export type EnergyUnit = 'kcal' | 'kJ';
export type WeightUnit = 'kg' | 'lb';

export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  activity: ActivityLevel;
  goal: GoalType;
  /** kg per week (positive number); direction is given by `goal` */
  weeklyRateKg: number;
}

export interface Goals {
  /** if true, calories + macros are recalculated from profile and latest weight */
  autoCalories: boolean;
  calories: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  waterMl: number;
  steps: number;
  fiberG: number;
  sugarMaxG: number;
  /** workouts per week */
  workoutsPerWeek: number;
}

export interface Settings {
  theme: ThemeMode;
  energyUnit: EnergyUnit;
  weightUnit: WeightUnit;
  glassSizeMl: number;
  bottleSizeMl: number;
  haptics: boolean;
  /** add burned workout calories to the daily budget */
  eatBackExercise: boolean;
  /** percentage of burned calories added back (0-100) */
  eatBackPercent: number;
  weekStartsMonday: boolean;
  showNutriScore: boolean;
  usePedometer: boolean;
  /** rest seconds between exercises in guided workouts */
  workoutRestSec: number;
  /** seconds per exercise in guided workouts */
  workoutWorkSec: number;
  countdownBeforeWorkout: boolean;
  keepScreenOn: boolean;
}

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  salt?: number;
  satFat?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  /** values per 100 g / 100 ml */
  per100: Nutrients;
  unit: 'g' | 'ml';
  servingSize?: number;
  servingLabel?: string;
  nutriScore?: string;
  imageUrl?: string;
  source: 'off' | 'custom' | 'builtin' | 'quick';
}

export interface FoodEntry {
  id: string;
  date: string;
  meal: MealType;
  food: FoodItem;
  /** amount in g / ml */
  amount: number;
  createdAt: number;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  exerciseId: string;
  name: string;
  durationMin: number;
  kcal: number;
  reps?: number;
  sets?: number;
  distanceKm?: number;
  note?: string;
  createdAt: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
  bodyFatPct?: number;
  waistCm?: number;
  createdAt: number;
}

export interface Challenge {
  id: string;
  exerciseId: string;
  name: string;
  target: number;
  unit: 'reps' | 'sec';
  enabled: boolean;
}

export type ReminderType =
  | 'water'
  | 'meal'
  | 'challenge'
  | 'workout'
  | 'weight'
  | 'goalcheck'
  | 'fasting'
  | 'custom';

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  body: string;
  enabled: boolean;
  /** 'times' = at the given times on the given weekdays; 'interval' = every N minutes between start/end */
  mode: 'times' | 'interval';
  times: ReminderTime[];
  /** 1 = Monday ... 7 = Sunday */
  weekdays: number[];
  intervalMin: number;
  startTime: ReminderTime;
  endTime: ReminderTime;
  /** for meal reminders: which meal (skip if already logged) */
  meal?: MealType;
  /** smart: skip if the related goal is already reached today */
  smart: boolean;
}

export interface FastingSession {
  id: string;
  start: number;
  end?: number;
  targetHours: number;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  profile: Profile;
  goals: Goals;
  settings: Settings;
  foodLog: FoodEntry[];
  customFoods: FoodItem[];
  recentFoods: FoodItem[];
  favorites: FoodItem[];
  water: Record<string, number>;
  steps: Record<string, number>;
  workouts: WorkoutEntry[];
  weights: WeightEntry[];
  challenges: Challenge[];
  challengeLog: Record<string, Record<string, number>>;
  reminders: Reminder[];
  fasting: { active?: FastingSession; targetHours: number; history: FastingSession[] };
  /** stats used for achievements */
  stats: { scans: number; guidedWorkouts: number };
  unlockedAchievements: Record<string, number>;
}

import type { ActivityLevel, FoodEntry, FoodItem, Goals, Nutrients, Profile } from './types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { title: string; desc: string }> = {
  sedentary: { title: 'Kaum aktiv', desc: 'Bürojob, wenig Bewegung' },
  light: { title: 'Leicht aktiv', desc: '1–3× Sport pro Woche' },
  moderate: { title: 'Mäßig aktiv', desc: '3–5× Sport pro Woche' },
  active: { title: 'Sehr aktiv', desc: '6–7× Sport pro Woche' },
  very_active: { title: 'Extrem aktiv', desc: 'Körperliche Arbeit + Training' },
};

/** 1 kg body fat ≈ 7700 kcal */
export const KCAL_PER_KG = 7700;

export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return Math.max(0, now.getFullYear() - birthYear);
}

/** Mifflin-St Jeor */
export function bmr(sex: Profile['sex'], weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function tdee(profile: Profile, weightKg: number): number {
  const age = ageFromBirthYear(profile.birthYear);
  return Math.round(bmr(profile.sex, weightKg, profile.heightCm, age) * ACTIVITY_FACTORS[profile.activity]);
}

export function minCalories(sex: Profile['sex']): number {
  return sex === 'male' ? 1500 : 1200;
}

export function calorieGoal(profile: Profile, weightKg: number): number {
  const maintenance = tdee(profile, weightKg);
  const dailyDelta = Math.round((profile.weeklyRateKg * KCAL_PER_KG) / 7);
  let goal = maintenance;
  if (profile.goal === 'lose') goal = maintenance - dailyDelta;
  if (profile.goal === 'gain') goal = maintenance + dailyDelta;
  goal = Math.max(minCalories(profile.sex), goal);
  return Math.round(goal / 10) * 10;
}

export function defaultMacroSplit(goal: Profile['goal']): { proteinPct: number; carbsPct: number; fatPct: number } {
  if (goal === 'lose') return { proteinPct: 30, carbsPct: 40, fatPct: 30 };
  if (goal === 'gain') return { proteinPct: 25, carbsPct: 50, fatPct: 25 };
  return { proteinPct: 25, carbsPct: 45, fatPct: 30 };
}

export function waterGoalMl(weightKg: number): number {
  return Math.round((weightKg * 35) / 250) * 250;
}

export function macroGrams(goals: Pick<Goals, 'calories' | 'proteinPct' | 'carbsPct' | 'fatPct'>, calories = goals.calories) {
  return {
    protein: Math.round((calories * goals.proteinPct) / 100 / 4),
    carbs: Math.round((calories * goals.carbsPct) / 100 / 4),
    fat: Math.round((calories * goals.fatPct) / 100 / 9),
  };
}

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  if (h <= 0) return 0;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiCategory(value: number): string {
  if (value <= 0) return '–';
  if (value < 18.5) return 'Untergewicht';
  if (value < 25) return 'Normalgewicht';
  if (value < 30) return 'Übergewicht';
  return 'Adipositas';
}

/** healthy weight range for BMI 18.5–24.9 */
export function healthyWeightRange(heightCm: number): [number, number] {
  const h = heightCm / 100;
  return [Math.round(18.5 * h * h * 10) / 10, Math.round(24.9 * h * h * 10) / 10];
}

/** kcal burned = MET × kg × hours */
export function metKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

export function nutrientsFor(food: FoodItem, amount: number): Required<Nutrients> {
  const f = amount / 100;
  const p = food.per100;
  return {
    kcal: (p.kcal || 0) * f,
    protein: (p.protein || 0) * f,
    carbs: (p.carbs || 0) * f,
    fat: (p.fat || 0) * f,
    sugar: (p.sugar || 0) * f,
    fiber: (p.fiber || 0) * f,
    salt: (p.salt || 0) * f,
    satFat: (p.satFat || 0) * f,
  };
}

export function emptyTotals(): Required<Nutrients> {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, salt: 0, satFat: 0 };
}

export function sumEntries(entries: FoodEntry[]): Required<Nutrients> {
  const t = emptyTotals();
  for (const e of entries) {
    const n = nutrientsFor(e.food, e.amount);
    t.kcal += n.kcal;
    t.protein += n.protein;
    t.carbs += n.carbs;
    t.fat += n.fat;
    t.sugar += n.sugar;
    t.fiber += n.fiber;
    t.salt += n.salt;
    t.satFat += n.satFat;
  }
  return t;
}

/** Atwater check: kcal derived from macros when kcal is missing */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export const KJ_PER_KCAL = 4.184;

export function formatEnergy(kcal: number, unit: 'kcal' | 'kJ'): string {
  if (unit === 'kJ') return `${Math.round(kcal * KJ_PER_KCAL)} kJ`;
  return `${Math.round(kcal)} kcal`;
}

export function energyValue(kcal: number, unit: 'kcal' | 'kJ'): number {
  return Math.round(unit === 'kJ' ? kcal * KJ_PER_KCAL : kcal);
}

export const LB_PER_KG = 2.20462;

export function displayWeight(kg: number, unit: 'kg' | 'lb'): number {
  const v = unit === 'lb' ? kg * LB_PER_KG : kg;
  return Math.round(v * 10) / 10;
}

export function toKg(value: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? value / LB_PER_KG : value;
}

export function formatWeight(kg: number, unit: 'kg' | 'lb'): string {
  return `${formatNumber(displayWeight(kg, unit), 1)} ${unit}`;
}

/** German number formatting with comma decimal separator */
export function formatNumber(value: number, decimals = 0): string {
  if (!isFinite(value)) return '0';
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  const [int, dec] = Math.abs(rounded).toFixed(decimals).split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = rounded < 0 ? '-' : '';
  if (!dec || /^0+$/.test(dec)) return sign + withSep;
  return `${sign}${withSep},${dec.replace(/0+$/, '')}`;
}

/** Parses user input like "72,5" or "72.5" */
export function parseNumber(input: string): number | null {
  if (input == null) return null;
  const cleaned = String(input).trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

/** Estimated date to reach target weight given weekly rate */
export function weeksToTarget(currentKg: number, targetKg: number, weeklyRateKg: number): number | null {
  if (weeklyRateKg <= 0) return null;
  const diff = Math.abs(currentKg - targetKg);
  if (diff < 0.05) return 0;
  return Math.ceil(diff / weeklyRateKg);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

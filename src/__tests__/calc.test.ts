import {
  bmi,
  bmiCategory,
  bmr,
  calorieGoal,
  formatNumber,
  kcalFromMacros,
  macroGrams,
  metKcal,
  nutrientsFor,
  parseNumber,
  sumEntries,
  toKg,
  displayWeight,
  waterGoalMl,
  weeksToTarget,
} from '../lib/calc';
import { addDays, dateKey, daysBetween, lastNDays, startOfWeek } from '../lib/date';
import { DEFAULT_PROFILE } from '../lib/defaults';
import { searchLocal, BUILTIN_FOODS } from '../lib/foods';
import type { FoodEntry, FoodItem, Profile } from '../lib/types';

const food: FoodItem = {
  id: 'x',
  name: 'Test',
  per100: { kcal: 200, protein: 10, carbs: 20, fat: 5, sugar: 4 },
  unit: 'g',
  source: 'custom',
};

describe('calc', () => {
  it('computes BMR with Mifflin-St Jeor', () => {
    expect(bmr('male', 80, 180, 30)).toBe(1780);
    expect(bmr('female', 60, 165, 30)).toBe(1320);
  });

  it('computes calorie goals with deficit and minimum', () => {
    const p: Profile = { ...DEFAULT_PROFILE, sex: 'male', birthYear: new Date().getFullYear() - 30, heightCm: 180, activity: 'moderate', goal: 'lose', weeklyRateKg: 0.5 };
    const maintain = calorieGoal({ ...p, goal: 'maintain' }, 80);
    const lose = calorieGoal(p, 80);
    const gain = calorieGoal({ ...p, goal: 'gain' }, 80);
    expect(maintain).toBe(2760); // 1780 * 1.55 = 2759 -> rounded to 10
    expect(maintain - lose).toBeGreaterThan(500);
    expect(gain).toBeGreaterThan(maintain);
    const tiny: Profile = { ...p, sex: 'female', heightCm: 150, activity: 'sedentary', weeklyRateKg: 1 };
    expect(calorieGoal(tiny, 45)).toBe(1200);
  });

  it('splits macros into grams', () => {
    expect(macroGrams({ calories: 2000, proteinPct: 30, carbsPct: 40, fatPct: 30 })).toEqual({ protein: 150, carbs: 200, fat: 67 });
  });

  it('computes BMI and category', () => {
    expect(bmi(70, 175)).toBe(22.9);
    expect(bmiCategory(22.9)).toBe('Normalgewicht');
    expect(bmiCategory(31)).toBe('Adipositas');
  });

  it('scales nutrients by amount and sums entries', () => {
    expect(nutrientsFor(food, 50).kcal).toBe(100);
    const entries: FoodEntry[] = [
      { id: '1', date: '2026-01-01', meal: 'lunch', food, amount: 150, createdAt: 1 },
      { id: '2', date: '2026-01-01', meal: 'lunch', food, amount: 50, createdAt: 2 },
    ];
    const t = sumEntries(entries);
    expect(t.kcal).toBe(400);
    expect(t.protein).toBe(20);
    expect(t.sugar).toBe(8);
  });

  it('estimates MET calories', () => {
    expect(metKcal(8, 75, 30)).toBe(300);
  });

  it('parses and formats German numbers', () => {
    expect(parseNumber('72,5')).toBe(72.5);
    expect(parseNumber('72.5')).toBe(72.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1,2,3')).toBeNull();
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(2000)).toBe('2.000');
    expect(formatNumber(-3.25, 2)).toBe('-3,25');
    expect(formatNumber(5.0, 1)).toBe('5');
  });

  it('converts units and helpers', () => {
    expect(displayWeight(100, 'lb')).toBe(220.5);
    expect(Math.round(toKg(220.462, 'lb'))).toBe(100);
    expect(waterGoalMl(70)).toBe(2500);
    expect(weeksToTarget(80, 75, 0.5)).toBe(10);
    expect(kcalFromMacros(10, 20, 5)).toBe(165);
  });
});

describe('date', () => {
  it('handles day keys', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(lastNDays(3, '2026-01-02')).toEqual(['2025-12-31', '2026-01-01', '2026-01-02']);
    expect(startOfWeek('2026-11-22', true)).toBe('2026-11-16'); // Sunday -> Monday before
    expect(startOfWeek('2026-11-22', false)).toBe('2026-11-22');
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('local food search', () => {
  it('finds builtin foods with umlauts', () => {
    const r = searchLocal('hähnchen', BUILTIN_FOODS);
    expect(r[0]?.name).toBe('Hähnchenbrust');
    expect(searchLocal('haehnchen', BUILTIN_FOODS)[0]?.name).toBe('Hähnchenbrust');
    expect(searchLocal('', BUILTIN_FOODS)).toEqual([]);
  });
});

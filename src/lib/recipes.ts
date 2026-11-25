import { nutrientsFor } from './calc';
import type { FoodEntry, FoodItem, Nutrients, Recipe } from './types';

export function recipeTotals(r: Recipe): Required<Nutrients> & { weight: number } {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, salt: 0, satFat: 0, weight: 0 };
  for (const ing of r.ingredients) {
    const n = nutrientsFor(ing.food, ing.amount);
    t.kcal += n.kcal;
    t.protein += n.protein;
    t.carbs += n.carbs;
    t.fat += n.fat;
    t.sugar += n.sugar;
    t.fiber += n.fiber;
    t.salt += n.salt;
    t.satFat += n.satFat;
    t.weight += ing.amount;
  }
  return t;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** A recipe as a loggable food item: values per 100 g, one serving = one portion */
export function recipeToFood(r: Recipe): FoodItem | null {
  const t = recipeTotals(r);
  if (t.weight <= 0) return null;
  const f = 100 / t.weight;
  return {
    id: `recipe:${r.id}`,
    name: r.name,
    brand: r.ingredients.length === 1 ? undefined : `Rezept · ${r.servings} ${r.servings === 1 ? 'Portion' : 'Portionen'}`,
    per100: {
      kcal: Math.round(t.kcal * f),
      protein: r1(t.protein * f),
      carbs: r1(t.carbs * f),
      fat: r1(t.fat * f),
      sugar: r1(t.sugar * f),
      fiber: r1(t.fiber * f),
      salt: Math.round(t.salt * f * 100) / 100,
      satFat: r1(t.satFat * f),
    },
    unit: 'g',
    servingSize: r1(t.weight / Math.max(1, r.servings)),
    servingLabel: '1 Portion',
    source: 'recipe',
  };
}

/** Ingredients from logged entries (e.g. "save this breakfast as template") */
export function ingredientsFromEntries(entries: FoodEntry[]) {
  return entries.map((e) => ({ food: e.food, amount: e.amount }));
}

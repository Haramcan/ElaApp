import { BUILTIN_FOODS } from './foods';
import { recipeToFood } from './recipes';
import type { AppState, FoodItem } from './types';

/** In-memory hand-off of food items between screens (avoids huge route params) */
const cache = new Map<string, FoodItem>();

export function putFood(food: FoodItem): string {
  cache.set(food.id, food);
  return food.id;
}

export function findFood(id: string | undefined, state: AppState): FoodItem | undefined {
  if (!id) return undefined;
  if (id.startsWith('recipe:')) {
    const r = state.recipes.find((x) => `recipe:${x.id}` === id);
    const f = r ? recipeToFood(r) : null;
    if (f) return f;
  }
  return (
    cache.get(id) ??
    state.customFoods.find((f) => f.id === id) ??
    state.favorites.find((f) => f.id === id) ??
    state.recentFoods.find((f) => f.id === id) ??
    BUILTIN_FOODS.find((f) => f.id === id) ??
    state.foodLog.find((e) => e.food.id === id)?.food
  );
}

export function findByBarcode(code: string, state: AppState): FoodItem | undefined {
  const c = code.trim();
  return (
    state.customFoods.find((f) => f.barcode === c) ??
    state.favorites.find((f) => f.barcode === c) ??
    state.recentFoods.find((f) => f.barcode === c)
  );
}

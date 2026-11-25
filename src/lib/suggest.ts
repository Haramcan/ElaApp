import { nutrientsFor } from './calc';
import { BUILTIN_FOODS } from './foods';
import { recipeToFood } from './recipes';
import { daySummary } from './selectors';
import type { AppState, FoodItem, MealType } from './types';

export type FoodCategory = 'protein' | 'carb' | 'veg' | 'fruit' | 'dairy' | 'snack' | 'sweet' | 'drink' | 'fat' | 'dish' | 'other';

const CATS: Record<FoodCategory, string[]> = {
  protein: ['haehnchen', 'pute', 'rinderhack', 'rindersteak', 'lachs', 'thunfisch', 'tofu', 'ei', 'schinken', 'linsen', 'kichererbsen', 'kidney'],
  carb: ['reis', 'nudeln', 'kartoffel', 'suesskartoffel', 'vollkornbrot', 'toast', 'broetchen', 'quinoa', 'haferflocken', 'muesli', 'cornflakes'],
  veg: ['tomate', 'gurke', 'paprika', 'karotte', 'brokkoli', 'salat', 'spinat', 'zucchini', 'mais', 'salat_gemischt'],
  fruit: ['apfel', 'banane', 'orange', 'birne', 'erdbeeren', 'heidelbeeren', 'weintrauben', 'kiwi', 'mango'],
  dairy: ['joghurt', 'griech_joghurt', 'skyr', 'magerquark', 'huettenkaese', 'milch', 'milch35', 'hafermilch'],
  snack: ['mandeln', 'walnuesse', 'proteinriegel', 'avocado', 'gouda', 'mozzarella', 'feta'],
  sweet: ['schokolade', 'zartbitter', 'chips', 'gummibaerchen', 'eis', 'kuchen', 'croissant', 'nutella', 'marmelade', 'honig'],
  drink: ['wasser', 'kaffee', 'cappuccino', 'latte', 'orangensaft', 'apfelschorle', 'cola', 'cola_zero', 'bier', 'wein', 'proteinshake'],
  fat: ['butter', 'olivenoel', 'erdnussbutter', 'ketchup'],
  dish: ['pizza', 'doener', 'burger', 'pommes', 'spaghetti_bolo', 'currywurst', 'suppe'],
  other: [],
};

export function categoryOf(food: FoodItem): FoodCategory {
  if (food.source === 'recipe') return 'dish';
  const id = food.id.replace(/^builtin:/, '');
  for (const [cat, ids] of Object.entries(CATS) as [FoodCategory, string[]][]) if (ids.includes(id)) return cat;
  return 'other';
}

export interface SuggestionItem {
  food: FoodItem;
  amount: number;
}

export interface MealSuggestion {
  title: string;
  items: SuggestionItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: string;
}

function portion(food: FoodItem, factor = 1): number {
  const base = food.servingSize && food.servingSize > 0 ? food.servingSize : 100;
  return Math.round(base * factor);
}

function total(items: SuggestionItem[]) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const i of items) {
    const n = nutrientsFor(i.food, i.amount);
    t.kcal += n.kcal;
    t.protein += n.protein;
    t.carbs += n.carbs;
    t.fat += n.fat;
  }
  return t;
}

const byId = (id: string) => BUILTIN_FOODS.find((f) => f.id === `builtin:${id}`)!;

/** Classic combinations that make sense as a meal */
const MAIN_COMBOS: { title: string; ids: [string, number][] }[] = [
  { title: 'Hähnchen mit Reis & Brokkoli', ids: [['haehnchen', 1], ['reis', 1], ['brokkoli', 1]] },
  { title: 'Lachs mit Kartoffeln & Spinat', ids: [['lachs', 1], ['kartoffel', 1], ['spinat', 1]] },
  { title: 'Putenbrust mit Süßkartoffel & Salat', ids: [['pute', 1], ['suesskartoffel', 1], ['salat', 1]] },
  { title: 'Linsen mit Reis & Paprika', ids: [['linsen', 1.3], ['reis', 0.8], ['paprika', 1]] },
  { title: 'Tofu mit Quinoa & Zucchini', ids: [['tofu', 1.5], ['quinoa', 1], ['zucchini', 0.7]] },
  { title: 'Rührei mit Vollkornbrot & Tomate', ids: [['ei', 3], ['vollkornbrot', 2], ['tomate', 1]] },
  { title: 'Thunfisch-Salat mit Brot', ids: [['thunfisch', 1], ['salat_gemischt', 1], ['vollkornbrot', 1]] },
  { title: 'Nudeln mit Hack & Tomate', ids: [['nudeln', 1], ['rinderhack', 0.8], ['tomate', 2]] },
  { title: 'Steak mit Kartoffeln & Karotten', ids: [['rindersteak', 0.8], ['kartoffel', 1], ['karotte', 2]] },
  { title: 'Kichererbsen-Bowl', ids: [['kichererbsen', 1.5], ['quinoa', 0.7], ['gurke', 0.5], ['feta', 1]] },
];

const BREAKFAST_COMBOS: { title: string; ids: [string, number][] }[] = [
  { title: 'Haferflocken mit Skyr & Beeren', ids: [['haferflocken', 1], ['skyr', 1], ['heidelbeeren', 1]] },
  { title: 'Magerquark mit Banane', ids: [['magerquark', 2], ['banane', 1]] },
  { title: 'Rührei mit Toast', ids: [['ei', 2], ['toast', 2]] },
  { title: 'Griechischer Joghurt mit Müsli', ids: [['griech_joghurt', 1], ['muesli', 0.8], ['erdbeeren', 1]] },
  { title: 'Vollkornbrot mit Hüttenkäse & Tomate', ids: [['vollkornbrot', 2], ['huettenkaese', 1], ['tomate', 1]] },
];

const SNACK_COMBOS: { title: string; ids: [string, number][] }[] = [
  { title: 'Skyr pur', ids: [['skyr', 1]] },
  { title: 'Apfel mit Mandeln', ids: [['apfel', 1], ['mandeln', 0.7]] },
  { title: 'Proteinriegel', ids: [['proteinriegel', 1]] },
  { title: 'Hüttenkäse mit Gurke', ids: [['huettenkaese', 1], ['gurke', 0.5]] },
  { title: 'Proteinshake', ids: [['proteinshake', 1]] },
  { title: 'Banane', ids: [['banane', 1]] },
  { title: 'Gemüsesticks', ids: [['karotte', 2], ['paprika', 0.5]] },
  { title: 'Zartbitterschokolade (2 Stück)', ids: [['zartbitter', 1]] },
];

export interface SuggestResult {
  remainingKcal: number;
  remainingProtein: number;
  meal: MealType;
  targetKcal: number;
  meals: MealSuggestion[];
  snacks: MealSuggestion[];
  fromYourFoods: MealSuggestion[];
  message: string;
}

/** share of the remaining calories that the next meal should use */
function mealShare(meal: MealType): number {
  if (meal === 'breakfast') return 0.35;
  if (meal === 'lunch') return 0.55;
  if (meal === 'dinner') return 1;
  return 0.25;
}

function scaleCombo(title: string, ids: [string, number][], target: number, proteinNeed: number): MealSuggestion {
  let items = ids.map(([id, f]) => ({ food: byId(id), amount: portion(byId(id), f) }));
  const t0 = total(items);
  // scale the whole combination to the target (0.6–1.6×, rounded to 10 g)
  const factor = t0.kcal > 0 ? Math.min(1.6, Math.max(0.6, target / t0.kcal)) : 1;
  items = items.map((i) => ({ ...i, amount: Math.max(10, Math.round((i.amount * factor) / 10) * 10) }));
  const t = total(items);
  const reason =
    t.protein >= Math.min(30, proteinNeed) ? `${Math.round(t.protein)} g Eiweiß – deckt viel von deinem Restbedarf` : `passt in dein Budget von ${Math.round(target)} kcal`;
  return { title, items, ...t, reason };
}

function rank(list: MealSuggestion[], target: number, proteinNeed: number): MealSuggestion[] {
  const score = (m: MealSuggestion) => {
    const kcalDiff = Math.abs(m.kcal - target) / Math.max(1, target);
    const over = m.kcal > target * 1.1 ? 2 : 0;
    const proteinBonus = proteinNeed > 20 ? Math.min(1, m.protein / proteinNeed) : 0;
    return kcalDiff + over - proteinBonus * 0.6;
  };
  return [...list].sort((a, b) => score(a) - score(b));
}

export function suggestFood(state: AppState, date: string, meal: MealType): SuggestResult {
  const s = daySummary(state, date);
  const remainingKcal = Math.round(s.remaining);
  const remainingProtein = Math.max(0, Math.round(s.macroGoals.protein - s.protein));
  const targetKcal = Math.max(0, Math.round(remainingKcal * mealShare(meal)));

  if (remainingKcal <= 80) {
    const light = SNACK_COMBOS.filter((c) => ['Gemüsesticks', 'Hüttenkäse mit Gurke'].includes(c.title)).map((c) => scaleCombo(c.title, c.ids, 120, remainingProtein));
    return {
      remainingKcal,
      remainingProtein,
      meal,
      targetKcal,
      meals: [],
      snacks: light,
      fromYourFoods: [],
      message:
        remainingKcal < -100
          ? 'Dein Kalorienziel ist für heute erreicht. Wenn du noch Hunger hast: Gemüse, Wasser oder ungesüßter Tee.'
          : 'Du hast dein Ziel fast erreicht. Wenn überhaupt, dann etwas Leichtes:',
    };
  }

  const combos = meal === 'breakfast' ? BREAKFAST_COMBOS : meal === 'snack' ? SNACK_COMBOS : MAIN_COMBOS;
  // a single meal shouldn't use up an unrealistically large budget
  const MAX_MEAL: Record<MealType, number> = { breakfast: 700, lunch: 900, dinner: 900, snack: 350 };
  const mealTarget = Math.min(targetKcal, MAX_MEAL[meal]);
  const meals = rank(
    combos.map((c) => scaleCombo(c.title, c.ids, mealTarget, remainingProtein)),
    mealTarget,
    remainingProtein,
  ).slice(0, 4);

  const snackTarget = Math.min(250, Math.max(100, remainingKcal * 0.2));
  const snacks = rank(
    SNACK_COMBOS.map((c) => scaleCombo(c.title, c.ids, snackTarget, remainingProtein)),
    snackTarget,
    remainingProtein,
  )
    .filter((m) => m.kcal <= remainingKcal)
    .slice(0, 4);

  // the user's own favourites, recipes and recent foods that fit the budget
  const own: FoodItem[] = [
    ...state.recipes.map(recipeToFood).filter((f): f is FoodItem => !!f),
    ...state.favorites,
    ...state.recentFoods,
  ];
  const seen = new Set<string>();
  const fromYourFoods = own
    .filter((f) => {
      if (seen.has(f.id) || f.source === 'quick' || categoryOf(f) === 'drink') return false;
      seen.add(f.id);
      return true;
    })
    .map((f) => {
      const items = [{ food: f, amount: portion(f) }];
      const t = total(items);
      return { title: f.name, items, ...t, reason: f.source === 'recipe' ? 'Dein Rezept' : 'Aus deinen Lebensmitteln' };
    })
    .filter((m) => m.kcal > 0 && m.kcal <= remainingKcal * 1.05)
    .sort((a, b) => (remainingProtein > 20 ? b.protein / Math.max(1, b.kcal) - a.protein / Math.max(1, a.kcal) : Math.abs(a.kcal - mealTarget) - Math.abs(b.kcal - mealTarget)))
    .slice(0, 5);

  const message =
    remainingProtein > 30
      ? `Noch ${remainingKcal} kcal und ${remainingProtein} g Eiweiß offen – die Vorschläge setzen auf viel Eiweiß.`
      : `Noch ${remainingKcal} kcal offen. Für die nächste Mahlzeit passen ca. ${mealTarget} kcal.`;

  return { remainingKcal, remainingProtein, meal, targetKcal: mealTarget, meals, snacks, fromYourFoods, message };
}

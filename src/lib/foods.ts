import type { FoodItem } from './types';

type Row = [
  id: string,
  name: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  sugar: number,
  fiber: number,
  serving: number,
  servingLabel: string,
  unit?: 'g' | 'ml',
];

/** Approximate average values per 100 g / 100 ml for common generic foods */
const ROWS: Row[] = [
  // Obst
  ['apfel', 'Apfel', 54, 0.3, 12, 0.2, 10, 2, 150, '1 mittelgroßer Apfel'],
  ['banane', 'Banane', 93, 1.1, 20, 0.2, 17, 2, 120, '1 Banane (geschält)'],
  ['orange', 'Orange', 47, 0.9, 9, 0.2, 8.5, 2.2, 160, '1 Orange'],
  ['birne', 'Birne', 57, 0.4, 12, 0.3, 10, 3, 160, '1 Birne'],
  ['erdbeeren', 'Erdbeeren', 32, 0.7, 5.5, 0.4, 5, 2, 150, '1 Schale'],
  ['heidelbeeren', 'Heidelbeeren', 42, 0.6, 7.4, 0.6, 7.4, 4.9, 125, '1 Schale'],
  ['weintrauben', 'Weintrauben', 70, 0.7, 16, 0.3, 16, 1.5, 100, '1 Handvoll'],
  ['kiwi', 'Kiwi', 61, 1, 10, 0.6, 9, 3, 75, '1 Kiwi'],
  ['mango', 'Mango', 62, 0.6, 13, 0.4, 13, 1.7, 200, '1/2 Mango'],
  ['avocado', 'Avocado', 160, 2, 1.6, 15, 0.7, 6.7, 70, '1/2 Avocado'],
  // Gemüse
  ['tomate', 'Tomate', 18, 0.9, 2.6, 0.2, 2.6, 1.2, 80, '1 Tomate'],
  ['gurke', 'Gurke', 15, 0.6, 2.1, 0.2, 1.7, 0.6, 200, '1/2 Gurke'],
  ['paprika', 'Paprika rot', 37, 1, 6.4, 0.3, 6, 3.6, 150, '1 Paprika'],
  ['karotte', 'Karotte', 36, 0.9, 7.5, 0.2, 4.7, 2.8, 80, '1 Karotte'],
  ['brokkoli', 'Brokkoli', 34, 3.5, 2.7, 0.2, 1.7, 3, 150, '1 Portion'],
  ['salat', 'Blattsalat', 14, 1.3, 1.1, 0.2, 1, 1.4, 50, '1 Schale'],
  ['spinat', 'Spinat', 23, 2.9, 0.6, 0.4, 0.4, 2.6, 150, '1 Portion'],
  ['zucchini', 'Zucchini', 19, 1.6, 2.2, 0.4, 2, 1.1, 200, '1 Zucchini'],
  ['kartoffel', 'Kartoffeln gekocht', 72, 2, 15, 0.1, 0.8, 2, 200, '1 Portion'],
  ['suesskartoffel', 'Süßkartoffel gekocht', 86, 1.6, 20, 0.1, 6, 3, 200, '1 Portion'],
  ['mais', 'Mais (Dose)', 81, 2.9, 15, 1.2, 4.5, 2.4, 70, '1/2 Dose'],
  // Getreide & Beilagen
  ['haferflocken', 'Haferflocken', 372, 13.5, 58.7, 7, 0.7, 10, 50, '1 Portion'],
  ['reis', 'Reis gekocht', 130, 2.7, 28, 0.3, 0.1, 0.4, 180, '1 Portion'],
  ['reis_roh', 'Reis (roh)', 350, 7, 78, 0.6, 0.2, 1.4, 70, '1 Portion'],
  ['nudeln', 'Nudeln gekocht', 150, 5.2, 30, 0.9, 0.6, 1.8, 200, '1 Portion'],
  ['nudeln_roh', 'Nudeln (roh)', 355, 12.5, 70, 1.5, 3, 3, 100, '1 Portion'],
  ['vollkornbrot', 'Vollkornbrot', 220, 7.5, 39, 1.5, 2.5, 7.5, 50, '1 Scheibe'],
  ['toast', 'Toastbrot', 265, 8, 48, 3.5, 4, 3, 28, '1 Scheibe'],
  ['broetchen', 'Brötchen (Weizen)', 270, 9, 53, 1.8, 2, 3, 55, '1 Brötchen'],
  ['laugenbrezel', 'Laugenbrezel', 285, 9, 56, 2.5, 1.5, 2.5, 85, '1 Brezel'],
  ['muesli', 'Müsli (ungezuckert)', 360, 10, 62, 6.5, 12, 9, 50, '1 Portion'],
  ['cornflakes', 'Cornflakes', 375, 7, 84, 0.9, 8, 3, 30, '1 Portion'],
  ['quinoa', 'Quinoa gekocht', 120, 4.4, 21, 1.9, 0.9, 2.8, 150, '1 Portion'],
  // Milchprodukte & Eier
  ['milch', 'Milch 1,5 %', 47, 3.4, 4.8, 1.5, 4.8, 0, 200, '1 Glas', 'ml'],
  ['milch35', 'Vollmilch 3,5 %', 64, 3.3, 4.7, 3.5, 4.7, 0, 200, '1 Glas', 'ml'],
  ['hafermilch', 'Haferdrink', 46, 0.6, 6.8, 1.5, 3.3, 0.8, 200, '1 Glas', 'ml'],
  ['joghurt', 'Naturjoghurt 3,5 %', 66, 3.8, 4.7, 3.5, 4.7, 0, 150, '1 Becher'],
  ['griech_joghurt', 'Griechischer Joghurt 10 %', 120, 4, 4, 10, 4, 0, 150, '1 Portion'],
  ['skyr', 'Skyr', 63, 11, 4, 0.2, 4, 0, 150, '1 Portion'],
  ['magerquark', 'Magerquark', 67, 12, 4, 0.2, 4, 0, 125, '1/2 Becher'],
  ['huettenkaese', 'Hüttenkäse', 98, 12, 3, 4.3, 2.7, 0, 100, '1/2 Becher'],
  ['gouda', 'Gouda (45 % F.i.Tr.)', 356, 25, 0, 28, 0, 0, 30, '1 Scheibe'],
  ['mozzarella', 'Mozzarella', 250, 18, 1, 19, 1, 0, 125, '1 Kugel'],
  ['feta', 'Feta', 265, 14, 1, 23, 1, 0, 50, '1 Portion'],
  ['ei', 'Ei (Größe M)', 155, 13, 1.1, 11, 1.1, 0, 58, '1 Ei'],
  ['butter', 'Butter', 741, 0.7, 0.6, 83, 0.6, 0, 10, '1 Portion'],
  // Fleisch & Fisch
  ['haehnchen', 'Hähnchenbrust', 110, 23, 0, 1.5, 0, 0, 150, '1 Filet'],
  ['pute', 'Putenbrust', 105, 24, 0, 1, 0, 0, 150, '1 Filet'],
  ['rinderhack', 'Rinderhackfleisch', 250, 18, 0, 20, 0, 0, 125, '1 Portion'],
  ['rindersteak', 'Rindersteak', 160, 22, 0, 8, 0, 0, 200, '1 Steak'],
  ['schinken', 'Kochschinken', 115, 19, 1, 3.5, 1, 0, 20, '1 Scheibe'],
  ['salami', 'Salami', 380, 22, 1, 32, 1, 0, 10, '1 Scheibe'],
  ['lachs', 'Lachs', 200, 20, 0, 13, 0, 0, 125, '1 Filet'],
  ['thunfisch', 'Thunfisch (in Wasser)', 110, 25, 0, 1, 0, 0, 130, '1 Dose (abgetropft)'],
  ['tofu', 'Tofu natur', 125, 13, 1.5, 7.5, 0.6, 1, 100, '1 Portion'],
  // Hülsenfrüchte & Nüsse
  ['linsen', 'Linsen gekocht', 116, 9, 20, 0.4, 1.8, 8, 150, '1 Portion'],
  ['kichererbsen', 'Kichererbsen (Dose)', 120, 7, 16, 2.5, 0.5, 6, 120, '1 Portion'],
  ['kidney', 'Kidneybohnen (Dose)', 100, 7, 14, 0.5, 0.5, 6, 120, '1 Portion'],
  ['mandeln', 'Mandeln', 600, 21, 7, 52, 4.4, 12, 30, '1 Handvoll'],
  ['walnuesse', 'Walnüsse', 690, 15, 11, 65, 2.6, 6, 30, '1 Handvoll'],
  ['erdnussbutter', 'Erdnussbutter', 600, 25, 13, 50, 6, 6, 15, '1 EL'],
  // Snacks & Süßes
  ['schokolade', 'Vollmilchschokolade', 540, 7, 57, 31, 55, 2, 25, '1 Riegel'],
  ['zartbitter', 'Zartbitterschokolade 70 %', 580, 8, 33, 43, 28, 11, 20, '2 Stück'],
  ['chips', 'Kartoffelchips', 540, 6, 51, 34, 1, 4, 30, '1 Handvoll'],
  ['gummibaerchen', 'Fruchtgummi', 340, 6.5, 77, 0.2, 46, 0, 25, '1 Handvoll'],
  ['proteinriegel', 'Proteinriegel', 370, 32, 35, 12, 3, 8, 50, '1 Riegel'],
  ['eis', 'Speiseeis (Vanille)', 210, 3.5, 25, 11, 22, 0, 75, '1 Kugel'],
  ['kuchen', 'Kuchen (Rührkuchen)', 390, 5.5, 50, 19, 30, 1, 80, '1 Stück'],
  ['croissant', 'Croissant', 410, 8, 45, 22, 8, 2.5, 60, '1 Croissant'],
  // Gerichte
  ['pizza', 'Pizza Margherita', 250, 10, 30, 9, 3, 2, 350, '1 Pizza'],
  ['doener', 'Döner Kebab', 215, 12, 20, 9.5, 3, 2, 400, '1 Döner'],
  ['burger', 'Hamburger', 250, 13, 26, 10, 5, 1.5, 200, '1 Burger'],
  ['pommes', 'Pommes frites', 290, 3.4, 36, 15, 0.3, 3.5, 150, '1 Portion'],
  ['spaghetti_bolo', 'Spaghetti Bolognese', 150, 7, 18, 5, 3, 1.5, 400, '1 Teller'],
  ['currywurst', 'Currywurst', 260, 9, 9, 21, 7, 0.5, 200, '1 Portion'],
  ['salat_gemischt', 'Gemischter Salat mit Dressing', 70, 1.5, 4, 5, 3, 1.5, 250, '1 Schüssel'],
  ['suppe', 'Gemüsesuppe', 40, 1.5, 6, 1, 2.5, 1.5, 300, '1 Teller', 'ml'],
  // Getränke
  ['wasser', 'Wasser', 0, 0, 0, 0, 0, 0, 250, '1 Glas', 'ml'],
  ['kaffee', 'Kaffee schwarz', 2, 0.1, 0, 0, 0, 0, 200, '1 Tasse', 'ml'],
  ['cappuccino', 'Cappuccino', 40, 2.2, 3.2, 2, 3.2, 0, 200, '1 Tasse', 'ml'],
  ['latte', 'Latte Macchiato', 50, 2.7, 4, 2.6, 4, 0, 300, '1 Glas', 'ml'],
  ['orangensaft', 'Orangensaft', 45, 0.7, 9, 0.2, 9, 0.2, 200, '1 Glas', 'ml'],
  ['apfelschorle', 'Apfelschorle', 24, 0, 5.5, 0, 5.5, 0, 330, '1 Glas', 'ml'],
  ['cola', 'Cola', 42, 0, 10.6, 0, 10.6, 0, 330, '1 Dose', 'ml'],
  ['cola_zero', 'Cola Zero', 0.3, 0, 0, 0, 0, 0, 330, '1 Dose', 'ml'],
  ['bier', 'Bier (Pils)', 42, 0.5, 3, 0, 0, 0, 500, '1 Flasche', 'ml'],
  ['wein', 'Rotwein', 85, 0.1, 2.6, 0, 0.6, 0, 200, '1 Glas', 'ml'],
  ['proteinshake', 'Proteinshake (mit Wasser)', 40, 8, 1, 0.5, 0.8, 0, 300, '1 Shake', 'ml'],
  // Sonstiges
  ['olivenoel', 'Olivenöl', 884, 0, 0, 100, 0, 0, 10, '1 EL', 'ml'],
  ['honig', 'Honig', 304, 0.3, 82, 0, 82, 0, 20, '1 TL'],
  ['marmelade', 'Konfitüre', 250, 0.4, 60, 0.1, 58, 1, 20, '1 Portion'],
  ['nutella', 'Nuss-Nougat-Creme', 540, 6, 57, 31, 56, 3.5, 15, '1 Portion'],
  ['ketchup', 'Ketchup', 100, 1.2, 23, 0.1, 22, 0.3, 15, '1 EL'],
];

export const BUILTIN_FOODS: FoodItem[] = ROWS.map(
  ([id, name, kcal, protein, carbs, fat, sugar, fiber, serving, servingLabel, unit]) => ({
    id: `builtin:${id}`,
    name,
    per100: { kcal, protein, carbs, fat, sugar, fiber },
    unit: unit ?? 'g',
    servingSize: serving,
    servingLabel,
    source: 'builtin',
  }),
);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Simple local search ranking: prefix match > word prefix > contains */
export function searchLocal(query: string, foods: FoodItem[], limit = 30): FoodItem[] {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored: { f: FoodItem; s: number }[] = [];
  for (const f of foods) {
    const hay = normalize(`${f.name} ${f.brand ?? ''}`);
    if (!terms.every((t) => hay.includes(t))) continue;
    let s = 1;
    if (hay.startsWith(q)) s += 10;
    if (hay.split(/\s+/).some((w) => w.startsWith(terms[0]))) s += 4;
    if (f.source === 'custom') s += 2;
    s -= hay.length / 100;
    scored.push({ f, s });
  }
  scored.sort((a, b) => b.s - a.s);
  const seen = new Set<string>();
  const out: FoodItem[] = [];
  for (const { f } of scored) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

import { Platform } from 'react-native';

import { kcalFromMacros } from './calc';
import type { FoodItem } from './types';

const UA = 'FitnessApp/1.0 (Expo React Native)';
const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'generic_name_de',
  'brands',
  'nutriments',
  'serving_quantity',
  'serving_size',
  'nutriscore_grade',
  'nutrition_grades',
  'image_front_small_url',
  'quantity',
  'product_quantity_unit',
].join(',');

export class OffError extends Error {
  constructor(
    message: string,
    public kind: 'network' | 'notfound' | 'invalid',
  ) {
    super(message);
  }
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return isFinite(n) ? n : undefined;
}

function round(v: number | undefined, d = 1): number | undefined {
  if (v == null) return undefined;
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

/** Converts a raw Open Food Facts product into our FoodItem; returns null if no nutrition data */
export function parseOffProduct(raw: any): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw.nutriments ?? {};
  const protein = num(n.proteins_100g) ?? 0;
  const carbs = num(n.carbohydrates_100g) ?? 0;
  const fat = num(n.fat_100g) ?? 0;
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null) {
    const kj = num(n['energy-kj_100g']) ?? num(n.energy_100g);
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null && (protein || carbs || fat)) kcal = kcalFromMacros(protein, carbs, fat);
  if (kcal == null) return null;

  const brandsRaw = raw.brands;
  const brand = Array.isArray(brandsRaw)
    ? brandsRaw.map((b: string) => String(b).trim()).filter(Boolean)[0]
    : typeof brandsRaw === 'string'
      ? brandsRaw.split(',')[0].trim()
      : undefined;

  const name = String(raw.product_name_de || raw.product_name || raw.generic_name_de || '').trim() || 'Unbekanntes Produkt';
  const qtyUnit = String(raw.product_quantity_unit || '').toLowerCase();
  const quantityStr = String(raw.quantity || '').toLowerCase();
  const isLiquid = qtyUnit === 'ml' || /\d\s*(ml|l|cl)\b/.test(quantityStr);
  const servingQty = num(raw.serving_quantity);
  const code = String(raw.code || '').trim();

  return {
    id: code ? `off:${code}` : `off:${name}`,
    name,
    brand: brand || undefined,
    barcode: code || undefined,
    per100: {
      kcal: Math.round(kcal),
      protein: round(protein)!,
      carbs: round(carbs)!,
      fat: round(fat)!,
      sugar: round(num(n.sugars_100g)),
      fiber: round(num(n.fiber_100g)),
      salt: round(num(n.salt_100g), 2),
      satFat: round(num(n['saturated-fat_100g'])),
    },
    unit: isLiquid ? 'ml' : 'g',
    servingSize: servingQty && servingQty > 0 ? Math.round(servingQty * 10) / 10 : undefined,
    servingLabel: raw.serving_size ? String(raw.serving_size) : undefined,
    nutriScore: (() => {
      const g = String(raw.nutriscore_grade || raw.nutrition_grades || '').toLowerCase();
      return /^[a-e]$/.test(g) ? g : undefined;
    })(),
    imageUrl: raw.image_front_small_url || undefined,
    source: 'off',
  };
}

async function fetchJson(url: string, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      // browsers don't allow overriding the User-Agent without a CORS preflight
      headers: Platform.OS === 'web' ? { Accept: 'application/json' } : { Accept: 'application/json', 'User-Agent': UA },
      signal: controller.signal,
    });
    if (res.status === 404) throw new OffError('Produkt nicht gefunden', 'notfound');
    if (!res.ok) throw new OffError(`Serverfehler (${res.status})`, 'network');
    return await res.json();
  } catch (e) {
    if (e instanceof OffError) throw e;
    throw new OffError('Keine Verbindung zur Lebensmittel-Datenbank', 'network');
  } finally {
    clearTimeout(timer);
  }
}

export function isValidBarcode(code: string): boolean {
  return /^\d{6,14}$/.test(code.trim());
}

export async function fetchProductByBarcode(code: string): Promise<FoodItem> {
  const clean = code.trim();
  if (!isValidBarcode(clean)) throw new OffError('Ungültiger Barcode', 'invalid');
  const data = await fetchJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}?fields=${FIELDS}`,
  );
  if (!data || data.status === 0 || !data.product) throw new OffError('Produkt nicht gefunden', 'notfound');
  const item = parseOffProduct({ ...data.product, code: data.product.code || clean });
  if (!item) throw new OffError('Für dieses Produkt sind keine Nährwerte hinterlegt', 'notfound');
  return item;
}

export async function searchProducts(query: string, pageSize = 25): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const legacySearch = async () => {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&lc=de&sort_by=unique_scans_n&page_size=${pageSize}&fields=${FIELDS}`;
    let data: any;
    try {
      data = await fetchJson(url);
    } catch {
      // the public API is occasionally rate limited – retry once after a short pause
      await new Promise((r) => setTimeout(r, 1200));
      data = await fetchJson(url);
    }
    return Array.isArray(data?.products) ? data.products : [];
  };
  let products: any[] = [];
  if (Platform.OS === 'web') {
    // the newer search service does not send CORS headers -> browsers can only use the classic API
    products = await legacySearch();
  } else {
    try {
      const data = await fetchJson(
        `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=${pageSize}&langs=de&fields=${FIELDS}`,
      );
      products = Array.isArray(data?.hits) ? data.hits : [];
    } catch {
      products = await legacySearch();
    }
  }
  const out: FoodItem[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const item = parseOffProduct(p);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

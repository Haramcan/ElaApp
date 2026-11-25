import Anthropic from '@anthropic-ai/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_NAME = 'fitlife-anthropic-key';
export const AI_MODEL = 'claude-opus-5-5';

// ---------- key storage (Keychain / Keystore on the phone) ----------
export async function getApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return await AsyncStorage.getItem(KEY_NAME);
    return await SecureStore.getItemAsync(KEY_NAME);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (key) await AsyncStorage.setItem(KEY_NAME, key);
    else await AsyncStorage.removeItem(KEY_NAME);
    return;
  }
  if (key) await SecureStore.setItemAsync(KEY_NAME, key);
  else await SecureStore.deleteItemAsync(KEY_NAME);
}

export function looksLikeKey(key: string): boolean {
  return /^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(key.trim());
}

function client(apiKey: string) {
  // the key belongs to the user and only lives on their own device
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: Platform.OS === 'web', maxRetries: 1, timeout: 60_000 });
}

// ---------- meal photo analysis ----------
export interface AiFoodItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AiMealResult {
  items: AiFoodItem[];
  note: string;
  confidence: 'hoch' | 'mittel' | 'niedrig';
}

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Deutscher Name des Lebensmittels, kurz' },
    grams: { type: 'number', description: 'Geschätzte Menge in Gramm (bei Getränken ml)' },
    kcal: { type: 'number', description: 'Kalorien für diese Menge' },
    protein: { type: 'number', description: 'Eiweiß in g für diese Menge' },
    carbs: { type: 'number', description: 'Kohlenhydrate in g für diese Menge' },
    fat: { type: 'number', description: 'Fett in g für diese Menge' },
  },
  required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
  additionalProperties: false,
};

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: ITEM_SCHEMA },
    note: { type: 'string', description: 'Ein kurzer Satz auf Deutsch: was erkannt wurde bzw. was unsicher ist' },
    confidence: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] },
  },
  required: ['items', 'note', 'confidence'],
  additionalProperties: false,
};

const SYSTEM = `Du bist eine Ernährungs-Assistenz in einer deutschen Kalorienzähler-App.
Du bekommst ein Foto einer Mahlzeit. Erkenne die einzelnen Lebensmittel und schätze für jedes die Menge (Gramm bzw. ml) und die Nährwerte für genau diese Menge.
Orientiere dich an typischen deutschen Nährwerttabellen und üblichen Portionsgrößen; nutze Teller, Besteck und Hände als Größenvergleich.
Zubereitung zählt: Öl, Butter, Soßen und Dressings mit einrechnen, wenn sie sichtbar oder wahrscheinlich sind.
Zeigt das Foto kein Essen, gib eine leere Liste zurück und erkläre es in "note".`;

export class AiError extends Error {
  constructor(
    message: string,
    public kind: 'nokey' | 'auth' | 'network' | 'refusal' | 'invalid' | 'other',
  ) {
    super(message);
  }
}

export async function analyzeMealPhoto(base64Jpeg: string, hint?: string): Promise<AiMealResult> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new AiError('Kein API-Schlüssel hinterlegt.', 'nokey');

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client(apiKey).beta.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      // if the model declines, the API retries on Anthropic's recommended fallback model
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Jpeg } },
            { type: 'text', text: hint?.trim() ? `Hinweis von mir: ${hint.trim()}` : 'Was ist auf dem Teller und wie viel?' },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new AiError('Der API-Schlüssel ist ungültig oder gesperrt.', 'auth');
    }
    if (e instanceof Anthropic.RateLimitError) throw new AiError('Zu viele Anfragen – bitte kurz warten.', 'other');
    if (e instanceof Anthropic.BadRequestError) throw new AiError(`Anfrage abgelehnt: ${e.message}`, 'invalid');
    if (e instanceof Anthropic.APIConnectionError) throw new AiError('Keine Internetverbindung.', 'network');
    if (e instanceof Anthropic.APIError) throw new AiError(`KI-Dienst nicht erreichbar (${e.status ?? '?'}).`, 'other');
    throw new AiError('Unbekannter Fehler bei der Analyse.', 'other');
  }

  if (response.stop_reason === 'refusal') throw new AiError('Das Foto konnte nicht analysiert werden.', 'refusal');
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  if (!text) throw new AiError('Keine Antwort erhalten.', 'invalid');
  let parsed: AiMealResult;
  try {
    parsed = JSON.parse(text) as AiMealResult;
  } catch {
    throw new AiError('Die Antwort war unvollständig – bitte erneut versuchen.', 'invalid');
  }
  return sanitize(parsed);
}

export function sanitize(r: AiMealResult): AiMealResult {
  const n = (v: unknown, max: number) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(0, v)) : 0);
  return {
    note: typeof r.note === 'string' ? r.note : '',
    confidence: r.confidence === 'hoch' || r.confidence === 'niedrig' ? r.confidence : 'mittel',
    items: (Array.isArray(r.items) ? r.items : [])
      .slice(0, 15)
      .map((i) => ({
        name: String(i.name || 'Lebensmittel').slice(0, 60),
        grams: Math.round(n(i.grams, 3000)),
        kcal: Math.round(n(i.kcal, 5000)),
        protein: Math.round(n(i.protein, 500) * 10) / 10,
        carbs: Math.round(n(i.carbs, 800) * 10) / 10,
        fat: Math.round(n(i.fat, 500) * 10) / 10,
      }))
      .filter((i) => i.grams > 0),
  };
}

/** Quick request to check that a key works (tiny and cheap) */
export async function testApiKey(key: string): Promise<boolean> {
  try {
    await client(key.trim()).models.retrieve(AI_MODEL);
    return true;
  } catch {
    return false;
  }
}

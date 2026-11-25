import { GYM_EXERCISES, makeKey } from './gym';
import type { AppState, GymExercise, TrainingPlan } from './types';

export const SHARE_PREFIX = 'FITLIFE1:';

// ---- tiny UTF-8 safe base64url (no platform dependencies) ----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8Encode(str: string): number[] {
  const out: number[] = [];
  for (const ch of str) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return out;
}

function utf8Decode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let c: number;
    if (b < 0x80) c = b;
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63);
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    out += String.fromCodePoint(c);
  }
  return out;
}

export function toBase64Url(str: string): string {
  const bytes = utf8Encode(str);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

export function fromBase64Url(s: string): string {
  const clean = s.replace(/[^A-Za-z0-9\-_]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = clean.slice(i, i + 4);
    const v = chunk.split('').map((ch) => B64.indexOf(ch));
    if (v.some((x) => x < 0)) throw new Error('invalid');
    const n = (v[0] << 18) | (v[1] << 12) | ((v[2] ?? 0) << 6) | (v[3] ?? 0);
    bytes.push((n >> 16) & 255);
    if (chunk.length > 2) bytes.push((n >> 8) & 255);
    if (chunk.length > 3) bytes.push(n & 255);
  }
  return utf8Decode(bytes);
}

// ---- compact plan format ----
interface Compact {
  v: 1;
  n: string;
  ds?: string;
  by?: string;
  d: { n: string; e: [string, number, number, number, number][] }[];
  /** custom exercises used in the plan: [id, name, muscle, equipment] */
  x?: [string, string, string, string][];
}

export function encodePlan(state: AppState, plan: TrainingPlan, from?: string): string {
  const used = new Set(plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
  const custom = state.gym.customExercises.filter((e) => used.has(e.id));
  const c: Compact = {
    v: 1,
    n: plan.name,
    ds: plan.description,
    by: from?.trim() || undefined,
    d: plan.days.map((d) => ({ n: d.name, e: d.exercises.map((e) => [e.exerciseId, e.sets, e.repsMin, e.repsMax, e.restSec]) })),
    x: custom.length ? custom.map((e) => [e.id, e.name, e.muscle, e.equipment]) : undefined,
  };
  return SHARE_PREFIX + toBase64Url(JSON.stringify(c));
}

export interface DecodedPlan {
  plan: TrainingPlan;
  customExercises: GymExercise[];
  from?: string;
}

const clampInt = (v: unknown, min: number, max: number, def: number) => {
  const n = typeof v === 'number' && isFinite(v) ? Math.round(v) : def;
  return Math.min(max, Math.max(min, n));
};

/** Finds a share code inside any text (e.g. a forwarded chat message) */
export function extractCode(text: string): string | null {
  const m = text.match(/FITLIFE1:([A-Za-z0-9\-_]+)/) ?? text.match(/[?&]code=FITLIFE1(?::|%3A)([A-Za-z0-9\-_]+)/i);
  return m ? SHARE_PREFIX + m[1] : null;
}

export function decodePlan(text: string): DecodedPlan {
  const code = extractCode(text);
  if (!code) throw new Error('Kein FitLife-Plan-Code gefunden.');
  let c: Compact;
  try {
    c = JSON.parse(fromBase64Url(code.slice(SHARE_PREFIX.length)));
  } catch {
    throw new Error('Der Code ist beschädigt oder unvollständig.');
  }
  if (!c || c.v !== 1 || !Array.isArray(c.d)) throw new Error('Unbekanntes Plan-Format.');
  // custom exercises get new ids so they never clash with the receiver's own ones
  const idMap = new Map<string, string>();
  const customExercises: GymExercise[] = (c.x ?? []).slice(0, 50).map(([id, name, muscle, equipment]) => {
    const nid = makeKey('gx_');
    idMap.set(id, nid);
    return { id: nid, name: String(name).slice(0, 50), muscle: muscle as GymExercise['muscle'], equipment: equipment as GymExercise['equipment'], custom: true };
  });
  const known = new Set(GYM_EXERCISES.map((e) => e.id));
  const plan: TrainingPlan = {
    id: makeKey('plan_'),
    name: String(c.n || 'Geteilter Plan').slice(0, 50),
    description: c.ds ? String(c.ds).slice(0, 300) : undefined,
    createdAt: Date.now(),
    days: c.d.slice(0, 7).map((d) => ({
      id: makeKey('day_'),
      name: String(d.n || 'Tag').slice(0, 30),
      exercises: (Array.isArray(d.e) ? d.e : [])
        .slice(0, 20)
        .map(([id, sets, min, max, rest]) => {
          const exerciseId = idMap.get(id) ?? id;
          const repsMin = clampInt(min, 1, 50, 8);
          return {
            key: makeKey('pe_'),
            exerciseId,
            sets: clampInt(sets, 1, 10, 3),
            repsMin,
            repsMax: Math.max(repsMin, clampInt(max, 1, 50, 12)),
            restSec: clampInt(rest, 15, 300, 90),
          };
        })
        .filter((e) => known.has(e.exerciseId) || customExercises.some((x) => x.id === e.exerciseId)),
    })),
  };
  if (plan.days.length === 0) throw new Error('Der Plan enthält keine Trainingstage.');
  return { plan, customExercises, from: c.by ? String(c.by).slice(0, 30) : undefined };
}

export function shareMessage(code: string, planName: string, from?: string): string {
  return [
    `💪 ${from ? `${from} hat dir` : 'Hier ist'} einen Trainingsplan geschickt: „${planName}“`,
    '',
    'So importierst du ihn in FitLife: Diese Nachricht kopieren → FitLife öffnen → Training → Pläne → „Plan importieren“.',
    'Oder direkt öffnen:',
    `fitlife://gym/import?code=${encodeURIComponent(code)}`,
    '',
    code,
  ].join('\n');
}

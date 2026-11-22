import { normalize } from './foods';
import type {
  AppState,
  GymEquipment,
  GymExercise,
  GymExerciseLog,
  GymSession,
  GymSet,
  MuscleGroup,
  PlanDay,
  PlanExercise,
  TrainingPlan,
} from './types';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  brust: 'Brust',
  ruecken: 'Rücken',
  schultern: 'Schultern',
  beine: 'Beine',
  po: 'Po & Hüfte',
  arme: 'Arme',
  bauch: 'Bauch',
  ganzkoerper: 'Ganzkörper',
};

export const EQUIPMENT_LABELS: Record<GymEquipment, string> = {
  maschine: 'Maschine',
  kabel: 'Kabelzug',
  langhantel: 'Langhantel',
  kurzhantel: 'Kurzhantel',
  koerper: 'Körpergewicht',
  sonstiges: 'Sonstiges',
};

export const EQUIPMENT_ICONS: Record<GymEquipment, string> = {
  maschine: 'weight-lifter',
  kabel: 'jump-rope',
  langhantel: 'weight',
  kurzhantel: 'dumbbell',
  koerper: 'human-handsup',
  sonstiges: 'cog-outline',
};

type Row = [id: string, name: string, muscle: MuscleGroup, equipment: GymEquipment, tip?: string, bodyweight?: boolean];

/** Typical equipment found in most fitness studios */
const ROWS: Row[] = [
  // Brust
  ['chest_press', 'Brustpresse', 'brust', 'maschine', 'Griffe auf Brusthöhe einstellen, Schulterblätter zusammen.'],
  ['butterfly', 'Butterfly', 'brust', 'maschine', 'Ellbogen leicht gebeugt, langsam zurückführen.'],
  ['incline_chest_press', 'Schrägbank-Brustpresse', 'brust', 'maschine'],
  ['bench_press', 'Bankdrücken', 'brust', 'langhantel', 'Füße fest am Boden, Stange zur unteren Brust.'],
  ['incline_db_press', 'Schrägbankdrücken', 'brust', 'kurzhantel'],
  ['db_bench_press', 'Kurzhantel-Bankdrücken', 'brust', 'kurzhantel'],
  ['cable_crossover', 'Cable Crossover', 'brust', 'kabel'],
  ['dips_assisted', 'Dips (assistiert)', 'brust', 'maschine', 'Mehr Gegengewicht = leichter.'],
  // Rücken
  ['lat_pulldown', 'Latzug', 'ruecken', 'maschine', 'Stange zur oberen Brust ziehen, nicht in den Nacken.'],
  ['lat_pulldown_close', 'Latzug eng', 'ruecken', 'kabel'],
  ['seated_row_machine', 'Rudermaschine sitzend', 'ruecken', 'maschine', 'Brust ans Polster, Ellbogen nah am Körper.'],
  ['cable_row', 'Kabelrudern', 'ruecken', 'kabel', 'Rücken gerade, Schulterblätter zusammenziehen.'],
  ['pullup_assisted', 'Klimmzug (assistiert)', 'ruecken', 'maschine', 'Mehr Gegengewicht = leichter.'],
  ['pullup', 'Klimmzüge', 'ruecken', 'koerper', undefined, true],
  ['db_row', 'Kurzhantelrudern einarmig', 'ruecken', 'kurzhantel'],
  ['barbell_row', 'Langhantelrudern', 'ruecken', 'langhantel'],
  ['deadlift', 'Kreuzheben', 'ruecken', 'langhantel', 'Rücken neutral, Stange nah am Körper.'],
  ['back_extension', 'Rückenstrecker', 'ruecken', 'maschine'],
  ['hyperextension', 'Hyperextensions', 'ruecken', 'koerper', undefined, true],
  ['reverse_butterfly', 'Reverse Butterfly', 'schultern', 'maschine', 'Für hintere Schulter und oberen Rücken.'],
  ['pullover_machine', 'Pullover-Maschine', 'ruecken', 'maschine'],
  // Schultern
  ['shoulder_press_machine', 'Schulterpresse', 'schultern', 'maschine'],
  ['db_shoulder_press', 'Schulterdrücken Kurzhantel', 'schultern', 'kurzhantel'],
  ['lateral_raise', 'Seitheben', 'schultern', 'kurzhantel', 'Leicht nach vorne geneigt, bis Schulterhöhe.'],
  ['lateral_raise_machine', 'Seitheben Maschine', 'schultern', 'maschine'],
  ['cable_lateral_raise', 'Seitheben Kabel', 'schultern', 'kabel'],
  ['front_raise', 'Frontheben', 'schultern', 'kurzhantel'],
  ['face_pull', 'Face Pulls', 'schultern', 'kabel', 'Seil zum Gesicht, Ellbogen hoch.'],
  // Beine
  ['leg_press', 'Beinpresse', 'beine', 'maschine', 'Knie nicht ganz durchstrecken, Rücken am Polster.'],
  ['leg_extension', 'Beinstrecker', 'beine', 'maschine', 'Oben kurz halten, langsam ablassen.'],
  ['leg_curl_seated', 'Beinbeuger sitzend', 'beine', 'maschine'],
  ['leg_curl_lying', 'Beinbeuger liegend', 'beine', 'maschine'],
  ['hack_squat', 'Hackenschmidt', 'beine', 'maschine'],
  ['smith_squat', 'Kniebeuge Multipresse', 'beine', 'maschine'],
  ['squat', 'Kniebeugen Langhantel', 'beine', 'langhantel', 'Knie folgen den Zehen, Brust raus.'],
  ['goblet_squat', 'Goblet Squat', 'beine', 'kurzhantel'],
  ['lunges_db', 'Ausfallschritte Kurzhantel', 'beine', 'kurzhantel'],
  ['romanian_deadlift', 'Rumänisches Kreuzheben', 'beine', 'langhantel', 'Hüfte nach hinten schieben, Beine fast gestreckt.'],
  ['calf_raise_machine', 'Wadenheben Maschine', 'beine', 'maschine'],
  ['calf_raise_seated', 'Wadenheben sitzend', 'beine', 'maschine'],
  // Po & Hüfte
  ['abductor', 'Abduktoren-Maschine', 'po', 'maschine', 'Beine nach außen drücken, kontrolliert zurück.'],
  ['adductor', 'Adduktoren-Maschine', 'po', 'maschine'],
  ['hip_thrust', 'Hip Thrust', 'po', 'langhantel', 'Oben den Po 1 Sekunde anspannen.'],
  ['glute_kickback_machine', 'Glute Kickback Maschine', 'po', 'maschine'],
  ['cable_kickback', 'Kickbacks am Kabel', 'po', 'kabel'],
  // Arme
  ['biceps_curl_machine', 'Bizepscurl Maschine', 'arme', 'maschine'],
  ['db_curl', 'Bizepscurls Kurzhantel', 'arme', 'kurzhantel', 'Ellbogen am Körper, nicht schwingen.'],
  ['hammer_curl', 'Hammercurls', 'arme', 'kurzhantel'],
  ['ez_curl', 'SZ-Curls', 'arme', 'langhantel'],
  ['cable_curl', 'Bizepscurl Kabel', 'arme', 'kabel'],
  ['triceps_pushdown', 'Trizepsdrücken Kabel', 'arme', 'kabel', 'Ellbogen fixiert, Arme ganz strecken.'],
  ['triceps_machine', 'Trizeps-Maschine', 'arme', 'maschine'],
  ['overhead_triceps', 'Überkopf-Trizeps Kabel', 'arme', 'kabel'],
  ['french_press', 'French Press', 'arme', 'langhantel'],
  // Bauch
  ['ab_crunch_machine', 'Bauchmaschine (Crunch)', 'bauch', 'maschine', 'Langsam einrollen, Ausatmen beim Anspannen.'],
  ['torso_rotation', 'Rotationsmaschine', 'bauch', 'maschine'],
  ['cable_crunch', 'Cable Crunch', 'bauch', 'kabel'],
  ['leg_raise', 'Beinheben (Dip-Station)', 'bauch', 'koerper', undefined, true],
  ['plank_gym', 'Plank (Sekunden)', 'bauch', 'koerper', 'Wdh. = Sekunden halten.', true],
  // Ganzkörper
  ['kettlebell_swing', 'Kettlebell Swings', 'ganzkoerper', 'sonstiges'],
  ['farmers_walk', 'Farmer’s Walk', 'ganzkoerper', 'kurzhantel'],
];

export const GYM_EXERCISES: GymExercise[] = ROWS.map(([id, name, muscle, equipment, tip, bodyweight]) => ({
  id,
  name,
  muscle,
  equipment,
  tip,
  bodyweight,
}));

export function allGymExercises(state: AppState): GymExercise[] {
  return [...state.gym.customExercises, ...GYM_EXERCISES];
}

export function getGymExercise(state: AppState, id: string): GymExercise | undefined {
  return state.gym.customExercises.find((e) => e.id === id) ?? GYM_EXERCISES.find((e) => e.id === id);
}

export function gymExerciseName(state: AppState, id: string): string {
  return getGymExercise(state, id)?.name ?? 'Gelöschte Übung';
}

export function searchGymExercises(list: GymExercise[], query: string, muscle?: MuscleGroup | 'all'): GymExercise[] {
  const q = normalize(query);
  return list.filter(
    (e) =>
      (!muscle || muscle === 'all' || e.muscle === muscle) &&
      (!q || normalize(`${e.name} ${MUSCLE_LABELS[e.muscle]} ${EQUIPMENT_LABELS[e.equipment]}`).includes(q)),
  );
}

// ---------- statistics ----------

export function completedSets(log: GymExerciseLog): GymSet[] {
  return log.sets.filter((s) => s.done && (s.reps ?? 0) > 0);
}

/** Epley formula for an estimated one-rep max */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function topSet(log: GymExerciseLog): GymSet | undefined {
  let best: GymSet | undefined;
  for (const s of completedSets(log)) {
    if (!best || (s.weightKg ?? 0) > (best.weightKg ?? 0) || ((s.weightKg ?? 0) === (best.weightKg ?? 0) && (s.reps ?? 0) > (best.reps ?? 0))) best = s;
  }
  return best;
}

export function sessionVolume(session: GymSession): number {
  let v = 0;
  for (const ex of session.exercises) for (const s of completedSets(ex)) v += (s.weightKg ?? 0) * (s.reps ?? 0);
  return Math.round(v);
}

export function sessionSetCount(session: GymSession): number {
  return session.exercises.reduce((n, ex) => n + completedSets(ex).length, 0);
}

function sortedSessions(state: AppState): GymSession[] {
  return [...state.gym.sessions].sort((a, b) => b.start - a.start);
}

export interface ExerciseHistoryItem {
  session: GymSession;
  log: GymExerciseLog;
}

/** All past (finished) performances of an exercise, newest first */
export function exerciseHistory(state: AppState, exerciseId: string, excludeSessionId?: string): ExerciseHistoryItem[] {
  const out: ExerciseHistoryItem[] = [];
  for (const s of sortedSessions(state)) {
    if (s.id === excludeSessionId) continue;
    for (const log of s.exercises) {
      if (log.exerciseId === exerciseId && completedSets(log).length > 0) out.push({ session: s, log });
    }
  }
  return out;
}

export function lastPerformance(state: AppState, exerciseId: string, excludeSessionId?: string): ExerciseHistoryItem | undefined {
  return exerciseHistory(state, exerciseId, excludeSessionId)[0];
}

export function bestWeight(state: AppState, exerciseId: string, excludeSessionId?: string): number {
  let best = 0;
  for (const h of exerciseHistory(state, exerciseId, excludeSessionId)) {
    for (const s of completedSets(h.log)) best = Math.max(best, s.weightKg ?? 0);
  }
  return best;
}

export function best1RM(state: AppState, exerciseId: string): number {
  let best = 0;
  for (const h of exerciseHistory(state, exerciseId)) {
    for (const s of completedSets(h.log)) best = Math.max(best, estimate1RM(s.weightKg ?? 0, s.reps ?? 0));
  }
  return best;
}

/** Exercises in `session` where a new weight record was set compared to earlier sessions */
export function personalRecords(state: AppState, session: GymSession): { exerciseId: string; weightKg: number; previous: number }[] {
  const out: { exerciseId: string; weightKg: number; previous: number }[] = [];
  const seen = new Set<string>();
  for (const log of session.exercises) {
    if (seen.has(log.exerciseId)) continue;
    seen.add(log.exerciseId);
    const top = Math.max(0, ...session.exercises.filter((l) => l.exerciseId === log.exerciseId).flatMap((l) => completedSets(l).map((s) => s.weightKg ?? 0)));
    if (top <= 0) continue;
    const earlier = exerciseHistory(state, log.exerciseId, session.id).filter((h) => h.session.start < session.start);
    const previous = Math.max(0, ...earlier.flatMap((h) => completedSets(h.log).map((s) => s.weightKg ?? 0)));
    const hadHistory = earlier.length > 0;
    if (hadHistory && top > previous) out.push({ exerciseId: log.exerciseId, weightKg: top, previous });
  }
  return out;
}

// ---------- progression ----------

export interface Suggestion {
  weightKg: number | null;
  reps: number;
  kind: 'first' | 'increase' | 'repeat' | 'reduce';
  text: string;
}

export function roundToStep(v: number, step: number): number {
  if (step <= 0) return Math.round(v * 10) / 10;
  return Math.round(Math.round(v / step) * step * 100) / 100;
}

/**
 * Double progression: if every working set of the last session reached the upper rep target,
 * increase the weight by one step; if sets fell clearly short, keep (or slightly reduce) it.
 */
export function suggestNext(
  last: GymExerciseLog | undefined,
  opts: { repsMin?: number; repsMax?: number; step: number; bodyweight?: boolean },
): Suggestion {
  const min = opts.repsMin ?? 8;
  const max = opts.repsMax ?? 12;
  if (!last || completedSets(last).length === 0) {
    return { weightKg: null, reps: min, kind: 'first', text: `Erstes Mal: wähle ein Gewicht, mit dem du ${min}–${max} saubere Wiederholungen schaffst.` };
  }
  const sets = completedSets(last);
  const top = topSet(last);
  const w = top?.weightKg ?? 0;
  const working = sets.filter((s) => (s.weightKg ?? 0) >= w);
  const allMax = working.every((s) => (s.reps ?? 0) >= max);
  const anyFail = working.some((s) => (s.reps ?? 0) < min - 2);
  if (opts.bodyweight && w === 0) {
    if (allMax) return { weightKg: null, reps: max + 1, kind: 'increase', text: `Stark! Versuche heute ${max + 1}+ Wiederholungen oder Zusatzgewicht.` };
    return { weightKg: null, reps: Math.min(max, Math.max(...sets.map((s) => s.reps ?? 0)) + 1), kind: 'repeat', text: 'Versuche heute eine Wiederholung mehr.' };
  }
  if (allMax) {
    const next = roundToStep(w + opts.step, opts.step);
    return { weightKg: next, reps: min, kind: 'increase', text: `Alle Sätze geschafft – heute ${fmtKg(next)} probieren! 💪` };
  }
  if (anyFail && working.length > 0) {
    const lower = Math.max(0, roundToStep(w - opts.step, opts.step));
    return { weightKg: lower, reps: min, kind: 'reduce', text: `Letztes Mal war es zu schwer – heute ${fmtKg(lower)} und saubere Technik.` };
  }
  const bestReps = Math.max(...working.map((s) => s.reps ?? 0));
  return {
    weightKg: w,
    reps: Math.min(max, bestReps + 1),
    kind: 'repeat',
    text: `Bleib bei ${fmtKg(w)} und schaffe ${max} Wdh. in jedem Satz – dann steigern.`,
  };
}

function fmtKg(kg: number): string {
  const r = Math.round(kg * 100) / 100;
  return `${String(r).replace('.', ',')} kg`;
}

export function formatSets(log: GymExerciseLog, fmtWeight: (kg: number) => string): string {
  const sets = completedSets(log);
  if (sets.length === 0) return 'keine Sätze';
  // group equal weights: "15 kg × 12, 12, 10"
  const groups: { w: number; reps: number[] }[] = [];
  for (const s of sets) {
    const w = s.weightKg ?? 0;
    const g = groups[groups.length - 1];
    if (g && g.w === w) g.reps.push(s.reps ?? 0);
    else groups.push({ w, reps: [s.reps ?? 0] });
  }
  return groups.map((g) => `${g.w > 0 ? fmtWeight(g.w) : 'KG'} × ${g.reps.join(', ')}`).join(' · ');
}

/** Pre-filled sets for a new session based on the last performance and plan targets */
export function prefillSets(
  last: GymExerciseLog | undefined,
  count: number,
  suggestion: Suggestion,
): GymSet[] {
  const lastSets = last ? completedSets(last) : [];
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    let w: number | null = suggestion.weightKg;
    if (suggestion.kind === 'repeat' && lastSets[i]?.weightKg != null) w = lastSets[i].weightKg;
    return { weightKg: w, reps: null, done: false };
  });
}

let keyCounter = 0;
export function makeKey(prefix = 'k_'): string {
  keyCounter = (keyCounter + 1) % 100000;
  return `${prefix}${Date.now().toString(36)}${keyCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A new exercise log for a session, pre-filled from the last performance */
export function newSessionLog(
  state: AppState,
  exerciseId: string,
  target: { sets?: number; repsMin?: number; repsMax?: number; restSec?: number } = {},
): GymExerciseLog {
  const ex = getGymExercise(state, exerciseId);
  const last = lastPerformance(state, exerciseId);
  const sug = suggestNext(last?.log, { repsMin: target.repsMin, repsMax: target.repsMax, step: state.settings.gymWeightStep, bodyweight: ex?.bodyweight });
  const count = target.sets ?? (last ? completedSets(last.log).length : 3);
  return {
    key: makeKey('gl_'),
    exerciseId,
    sets: prefillSets(last?.log, Math.min(10, count), sug),
    repsMin: target.repsMin,
    repsMax: target.repsMax,
    restSec: target.restSec,
  };
}

export function sessionLogsFromDay(state: AppState, day: PlanDay): GymExerciseLog[] {
  return day.exercises.map((e) => newSessionLog(state, e.exerciseId, e));
}

/** Builds a new session from a previous one (same exercises, new pre-filled sets) */
export function sessionLogsFromSession(state: AppState, session: GymSession): GymExerciseLog[] {
  return session.exercises.map((l) => newSessionLog(state, l.exerciseId, { sets: l.sets.length, repsMin: l.repsMin, repsMax: l.repsMax, restSec: l.restSec }));
}

// ---------- plans ----------

export function nextPlanDay(state: AppState, plan: TrainingPlan): PlanDay | undefined {
  if (plan.days.length === 0) return undefined;
  const last = sortedSessions(state).find((s) => s.planId === plan.id && s.dayId);
  if (!last) return plan.days[0];
  const idx = plan.days.findIndex((d) => d.id === last.dayId);
  return plan.days[(idx + 1) % plan.days.length];
}

export type PlanGoal = 'muskelaufbau' | 'kraft' | 'abnehmen' | 'fitness';
export type PlanLevel = 'anfaenger' | 'fortgeschritten';
export type PlanEquipment = 'maschinen' | 'freihantel' | 'gemischt';

export interface PlanOptions {
  goal: PlanGoal;
  daysPerWeek: number;
  level: PlanLevel;
  equipment: PlanEquipment;
  focus?: 'ausgewogen' | 'oberkoerper' | 'beine_po';
}

export const GOAL_LABELS: Record<PlanGoal, string> = {
  muskelaufbau: 'Muskelaufbau',
  kraft: 'Maximalkraft',
  abnehmen: 'Abnehmen & Straffen',
  fitness: 'Allgemeine Fitness',
};

type Slot = 'chest' | 'back' | 'back_vertical' | 'shoulders' | 'side_delts' | 'rear_delts' | 'quads' | 'hams' | 'glutes' | 'calves' | 'biceps' | 'triceps' | 'abs';

const POOL: Record<Slot, { machine: string[]; free: string[] }> = {
  chest: { machine: ['chest_press', 'butterfly', 'incline_chest_press'], free: ['bench_press', 'incline_db_press', 'db_bench_press'] },
  back: { machine: ['seated_row_machine', 'cable_row'], free: ['db_row', 'barbell_row'] },
  back_vertical: { machine: ['lat_pulldown', 'pullup_assisted', 'lat_pulldown_close'], free: ['pullup', 'lat_pulldown'] },
  shoulders: { machine: ['shoulder_press_machine'], free: ['db_shoulder_press'] },
  side_delts: { machine: ['lateral_raise_machine', 'cable_lateral_raise'], free: ['lateral_raise'] },
  rear_delts: { machine: ['reverse_butterfly', 'face_pull'], free: ['face_pull'] },
  quads: { machine: ['leg_press', 'leg_extension', 'hack_squat'], free: ['squat', 'goblet_squat', 'lunges_db'] },
  hams: { machine: ['leg_curl_seated', 'leg_curl_lying'], free: ['romanian_deadlift', 'leg_curl_seated'] },
  glutes: { machine: ['abductor', 'glute_kickback_machine'], free: ['hip_thrust', 'cable_kickback'] },
  calves: { machine: ['calf_raise_machine', 'calf_raise_seated'], free: ['calf_raise_machine'] },
  biceps: { machine: ['biceps_curl_machine', 'cable_curl'], free: ['db_curl', 'hammer_curl', 'ez_curl'] },
  triceps: { machine: ['triceps_pushdown', 'triceps_machine'], free: ['triceps_pushdown', 'overhead_triceps', 'french_press'] },
  abs: { machine: ['ab_crunch_machine', 'cable_crunch', 'torso_rotation'], free: ['leg_raise', 'plank_gym', 'cable_crunch'] },
};

const TEMPLATES: Record<string, { name: string; slots: Slot[] }> = {
  fullA: { name: 'Ganzkörper A', slots: ['quads', 'chest', 'back_vertical', 'hams', 'shoulders', 'abs', 'biceps'] },
  fullB: { name: 'Ganzkörper B', slots: ['quads', 'back', 'chest', 'glutes', 'side_delts', 'triceps', 'abs'] },
  fullC: { name: 'Ganzkörper C', slots: ['hams', 'chest', 'back_vertical', 'quads', 'rear_delts', 'calves', 'abs'] },
  upper: { name: 'Oberkörper', slots: ['chest', 'back_vertical', 'shoulders', 'back', 'biceps', 'triceps', 'rear_delts'] },
  lower: { name: 'Unterkörper', slots: ['quads', 'hams', 'glutes', 'quads', 'calves', 'abs', 'glutes'] },
  push: { name: 'Push (Drücken)', slots: ['chest', 'shoulders', 'chest', 'side_delts', 'triceps', 'triceps', 'abs'] },
  pull: { name: 'Pull (Ziehen)', slots: ['back_vertical', 'back', 'rear_delts', 'back_vertical', 'biceps', 'biceps', 'abs'] },
  legs: { name: 'Beine & Po', slots: ['quads', 'hams', 'glutes', 'quads', 'calves', 'glutes', 'abs'] },
};

function splitFor(days: number, level: PlanLevel): string[] {
  if (days <= 1) return ['fullA'];
  if (days === 2) return ['fullA', 'fullB'];
  if (days === 3) return level === 'anfaenger' ? ['fullA', 'fullB', 'fullC'] : ['push', 'pull', 'legs'];
  if (days === 4) return ['upper', 'lower', 'upper', 'lower'];
  if (days === 5) return ['push', 'pull', 'legs', 'upper', 'lower'];
  return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
}

export function generatePlan(opts: PlanOptions, makeId: (prefix: string) => string): TrainingPlan {
  const days = Math.max(1, Math.min(6, Math.round(opts.daysPerWeek)));
  const reps =
    opts.goal === 'kraft' ? { min: 4, max: 6, rest: 150 } : opts.goal === 'muskelaufbau' ? { min: 8, max: 12, rest: 90 } : opts.goal === 'abnehmen' ? { min: 12, max: 15, rest: 60 } : { min: 10, max: 12, rest: 75 };
  const sets = opts.level === 'anfaenger' ? 3 : 4;
  const perDay = opts.level === 'anfaenger' ? 5 : 6;
  const split = splitFor(days, opts.level);
  const usage: Partial<Record<Slot, number>> = {};

  const pick = (slot: Slot, dayUsed: Set<string>): string => {
    const pool = POOL[slot];
    const order =
      opts.equipment === 'maschinen'
        ? [...pool.machine, ...pool.free]
        : opts.equipment === 'freihantel'
          ? [...pool.free, ...pool.machine]
          : pool.machine.flatMap((m, i) => [m, pool.free[i]].filter(Boolean) as string[]).concat(pool.free.slice(pool.machine.length));
    const start = usage[slot] ?? 0;
    for (let i = 0; i < order.length; i++) {
      const id = order[(start + i) % order.length];
      if (!dayUsed.has(id)) {
        usage[slot] = start + i + 1;
        return id;
      }
    }
    return order[0];
  };

  const focusSlots: Slot[] = opts.focus === 'oberkoerper' ? ['chest', 'back_vertical'] : opts.focus === 'beine_po' ? ['glutes', 'quads'] : [];

  const planDays: PlanDay[] = split.map((key, i) => {
    const tpl = TEMPLATES[key];
    const slots = [...tpl.slots.slice(0, perDay)];
    // focus: replace the last accessory slot with a focus slot
    if (focusSlots.length) slots[slots.length - 1] = focusSlots[i % focusSlots.length];
    const used = new Set<string>();
    const exercises: PlanExercise[] = slots.map((slot, j) => {
      const id = pick(slot, used);
      used.add(id);
      const isAccessory = j >= 3 || slot === 'abs' || slot === 'calves';
      return {
        key: makeId('pe_'),
        exerciseId: id,
        sets: isAccessory ? Math.max(2, sets - 1) : sets,
        repsMin: slot === 'abs' ? 12 : isAccessory && opts.goal === 'kraft' ? 8 : reps.min,
        repsMax: slot === 'abs' ? 20 : isAccessory && opts.goal === 'kraft' ? 12 : reps.max,
        restSec: isAccessory ? Math.min(reps.rest, 75) : reps.rest,
      };
    });
    const sameNameCount = split.slice(0, i).filter((k) => k === key).length;
    const suffix = split.filter((k) => k === key).length > 1 && !key.startsWith('full') ? ` ${sameNameCount + 1}` : '';
    return { id: makeId('day_'), name: `${tpl.name}${suffix}`, exercises };
  });

  const splitName = days <= 3 && split[0].startsWith('full') ? 'Ganzkörper' : days === 4 ? 'Oberkörper/Unterkörper' : 'Push/Pull/Beine';
  return {
    id: makeId('plan_'),
    name: `${GOAL_LABELS[opts.goal]} · ${days}× pro Woche`,
    description: `${splitName}-Split, ${sets} Sätze à ${reps.min}–${reps.max} Wdh., ${reps.rest} s Pause. ${
      opts.level === 'anfaenger' ? 'Fokus auf Technik – steigere das Gewicht, sobald du alle Wiederholungen schaffst.' : 'Steigere kontinuierlich Gewicht oder Wiederholungen.'
    }`,
    days: planDays,
    createdAt: Date.now(),
    generated: true,
  };
}

export const GYM_TIPS = [
  'Progressive Überlastung: Steigere Gewicht oder Wiederholungen, sobald du alle Sätze sauber schaffst.',
  'Notiere die Einstellungen der Geräte (Sitzhöhe, Lehne) – das spart Zeit und macht Werte vergleichbar.',
  'Wärm dich mit 1–2 leichten Sätzen auf, bevor du dein Arbeitsgewicht nimmst.',
  'Technik vor Gewicht: Lieber 2,5 kg weniger und dafür die volle Bewegung.',
  'Muskeln wachsen in der Pause – trainiere dieselbe Muskelgruppe nicht an zwei Tagen hintereinander schwer.',
  'Eiweiß nach dem Training (z. B. Skyr, Quark, Shake) unterstützt die Regeneration.',
];

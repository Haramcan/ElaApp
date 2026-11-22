export type ExerciseCategory = 'kraft' | 'cardio' | 'beweglichkeit' | 'alltag';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** metabolic equivalent of task */
  met: number;
  /** how the exercise is usually tracked */
  kind: 'reps' | 'duration' | 'distance';
  /** seconds per repetition (for reps → duration estimate) */
  secPerRep?: number;
  /** average speed in km/h for distance-based exercises */
  speedKmh?: number;
  icon: string;
  tip?: string;
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  kraft: 'Kraft',
  cardio: 'Ausdauer',
  beweglichkeit: 'Beweglichkeit',
  alltag: 'Alltag',
};

export const EXERCISES: Exercise[] = [
  { id: 'pushups', name: 'Liegestütze', category: 'kraft', met: 8, kind: 'reps', secPerRep: 2.5, icon: 'arm-flex', tip: 'Körper gerade halten, Brust fast bis zum Boden.' },
  { id: 'knee_pushups', name: 'Knie-Liegestütze', category: 'kraft', met: 5, kind: 'reps', secPerRep: 2.5, icon: 'arm-flex', tip: 'Ideal für Einsteiger – Knie am Boden, Rumpf stabil.' },
  { id: 'squats', name: 'Kniebeugen', category: 'kraft', met: 5, kind: 'reps', secPerRep: 3, icon: 'human-handsdown', tip: 'Fersen am Boden, Knie zeigen nach außen.' },
  { id: 'situps', name: 'Sit-ups', category: 'kraft', met: 8, kind: 'reps', secPerRep: 3, icon: 'human', tip: 'Langsam abrollen, nicht am Nacken ziehen.' },
  { id: 'crunches', name: 'Crunches', category: 'kraft', met: 3.8, kind: 'reps', secPerRep: 2.5, icon: 'human', tip: 'Nur Schulterblätter anheben, Bauch anspannen.' },
  { id: 'plank', name: 'Unterarmstütz (Plank)', category: 'kraft', met: 4, kind: 'duration', icon: 'human-handsdown', tip: 'Ellbogen unter den Schultern, Po nicht zu hoch.' },
  { id: 'lunges', name: 'Ausfallschritte', category: 'kraft', met: 4, kind: 'reps', secPerRep: 3, icon: 'walk', tip: 'Vorderes Knie nicht über die Zehen schieben.' },
  { id: 'burpees', name: 'Burpees', category: 'cardio', met: 8, kind: 'reps', secPerRep: 4, icon: 'run-fast', tip: 'Fließende Bewegung, beim Sprung strecken.' },
  { id: 'jumping_jacks', name: 'Hampelmann', category: 'cardio', met: 8, kind: 'reps', secPerRep: 1, icon: 'human-handsup', tip: 'Locker auf den Fußballen landen.' },
  { id: 'mountain_climbers', name: 'Mountain Climbers', category: 'cardio', met: 8, kind: 'reps', secPerRep: 1, icon: 'run-fast', tip: 'Hüfte tief halten, Knie zügig zur Brust.' },
  { id: 'pullups', name: 'Klimmzüge', category: 'kraft', met: 8, kind: 'reps', secPerRep: 3, icon: 'arm-flex', tip: 'Schultern aktiv nach unten ziehen.' },
  { id: 'dips', name: 'Dips', category: 'kraft', met: 6, kind: 'reps', secPerRep: 3, icon: 'arm-flex', tip: 'Ellbogen nach hinten, nicht nach außen.' },
  { id: 'glute_bridge', name: 'Glute Bridge', category: 'kraft', met: 3.5, kind: 'reps', secPerRep: 3, icon: 'human', tip: 'Po oben 1 Sekunde anspannen.' },
  { id: 'wall_sit', name: 'Wandsitzen', category: 'kraft', met: 4, kind: 'duration', icon: 'seat', tip: 'Knie im 90°-Winkel, Rücken an der Wand.' },
  { id: 'side_plank', name: 'Seitstütz', category: 'kraft', met: 4, kind: 'duration', icon: 'human-handsdown', tip: 'Hüfte hoch, Körper in einer Linie.' },
  { id: 'high_knees', name: 'Kniehebelauf', category: 'cardio', met: 8, kind: 'duration', icon: 'run', tip: 'Knie auf Hüfthöhe, Arme mitnehmen.' },
  { id: 'step_ups', name: 'Step-ups', category: 'kraft', met: 6, kind: 'reps', secPerRep: 2, icon: 'stairs-up', tip: 'Ganzen Fuß auf die Stufe setzen.' },
  { id: 'triceps_dips_chair', name: 'Trizeps-Dips am Stuhl', category: 'kraft', met: 5, kind: 'reps', secPerRep: 2.5, icon: 'chair-rolling', tip: 'Rücken nah am Stuhl führen.' },
  { id: 'superman', name: 'Superman', category: 'kraft', met: 3.5, kind: 'reps', secPerRep: 3, icon: 'human-handsup', tip: 'Arme und Beine gleichzeitig anheben.' },
  { id: 'weights', name: 'Krafttraining (Gerät/Hanteln)', category: 'kraft', met: 5, kind: 'duration', icon: 'dumbbell' },
  { id: 'running', name: 'Laufen / Joggen', category: 'cardio', met: 9.8, kind: 'distance', speedKmh: 9.5, icon: 'run' },
  { id: 'walking', name: 'Spazieren gehen', category: 'alltag', met: 3.5, kind: 'distance', speedKmh: 5, icon: 'walk' },
  { id: 'hiking', name: 'Wandern', category: 'cardio', met: 6, kind: 'distance', speedKmh: 4, icon: 'hiking' },
  { id: 'cycling', name: 'Radfahren', category: 'cardio', met: 7.5, kind: 'distance', speedKmh: 20, icon: 'bike' },
  { id: 'swimming', name: 'Schwimmen', category: 'cardio', met: 7, kind: 'distance', speedKmh: 2.5, icon: 'swim' },
  { id: 'rope', name: 'Seilspringen', category: 'cardio', met: 11, kind: 'duration', icon: 'jump-rope' },
  { id: 'hiit', name: 'HIIT', category: 'cardio', met: 8, kind: 'duration', icon: 'lightning-bolt' },
  { id: 'rowing', name: 'Rudern', category: 'cardio', met: 7, kind: 'duration', icon: 'rowing' },
  { id: 'elliptical', name: 'Crosstrainer', category: 'cardio', met: 5, kind: 'duration', icon: 'run' },
  { id: 'dancing', name: 'Tanzen', category: 'cardio', met: 5, kind: 'duration', icon: 'music' },
  { id: 'football', name: 'Fußball', category: 'cardio', met: 7, kind: 'duration', icon: 'soccer' },
  { id: 'basketball', name: 'Basketball', category: 'cardio', met: 6.5, kind: 'duration', icon: 'basketball' },
  { id: 'tennis', name: 'Tennis', category: 'cardio', met: 7.3, kind: 'duration', icon: 'tennis' },
  { id: 'boxing', name: 'Boxen', category: 'cardio', met: 7.8, kind: 'duration', icon: 'boxing-glove' },
  { id: 'yoga', name: 'Yoga', category: 'beweglichkeit', met: 2.5, kind: 'duration', icon: 'meditation' },
  { id: 'pilates', name: 'Pilates', category: 'beweglichkeit', met: 3, kind: 'duration', icon: 'yoga' },
  { id: 'stretching', name: 'Dehnen', category: 'beweglichkeit', met: 2.3, kind: 'duration', icon: 'human-handsup' },
  { id: 'cleaning', name: 'Hausarbeit', category: 'alltag', met: 3.3, kind: 'duration', icon: 'broom' },
  { id: 'gardening', name: 'Gartenarbeit', category: 'alltag', met: 3.8, kind: 'duration', icon: 'flower' },
  { id: 'stairs', name: 'Treppensteigen', category: 'alltag', met: 8, kind: 'duration', icon: 'stairs' },
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/** duration in minutes estimated from reps */
export function repsToMinutes(ex: Exercise | undefined, reps: number): number {
  const sec = (ex?.secPerRep ?? 3) * reps;
  return sec / 60;
}

export interface WorkoutPlanStep {
  exerciseId: string;
  /** seconds of work; if undefined the global setting is used */
  sec?: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  level: 'Anfänger' | 'Mittel' | 'Fortgeschritten';
  description: string;
  rounds: number;
  steps: WorkoutPlanStep[];
  icon: string;
}

export const WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: 'seven_min',
    name: '7-Minuten-Workout',
    level: 'Mittel',
    description: 'Der Klassiker: 12 Übungen à 30 Sekunden – trainiert den ganzen Körper.',
    rounds: 1,
    icon: 'timer-outline',
    steps: [
      { exerciseId: 'jumping_jacks' },
      { exerciseId: 'wall_sit' },
      { exerciseId: 'pushups' },
      { exerciseId: 'crunches' },
      { exerciseId: 'step_ups' },
      { exerciseId: 'squats' },
      { exerciseId: 'triceps_dips_chair' },
      { exerciseId: 'plank' },
      { exerciseId: 'high_knees' },
      { exerciseId: 'lunges' },
      { exerciseId: 'knee_pushups' },
      { exerciseId: 'side_plank' },
    ],
  },
  {
    id: 'beginner_full',
    name: 'Anfänger Ganzkörper',
    level: 'Anfänger',
    description: 'Sanfter Einstieg ohne Geräte – 2 Runden mit kurzen Übungen.',
    rounds: 2,
    icon: 'sprout',
    steps: [
      { exerciseId: 'squats', sec: 30 },
      { exerciseId: 'knee_pushups', sec: 30 },
      { exerciseId: 'glute_bridge', sec: 30 },
      { exerciseId: 'crunches', sec: 30 },
      { exerciseId: 'plank', sec: 20 },
    ],
  },
  {
    id: 'core',
    name: 'Bauch & Rumpf',
    level: 'Mittel',
    description: 'Gezieltes Core-Training für einen stabilen Rumpf.',
    rounds: 2,
    icon: 'human',
    steps: [
      { exerciseId: 'crunches', sec: 40 },
      { exerciseId: 'plank', sec: 40 },
      { exerciseId: 'mountain_climbers', sec: 30 },
      { exerciseId: 'side_plank', sec: 30 },
      { exerciseId: 'superman', sec: 30 },
      { exerciseId: 'situps', sec: 30 },
    ],
  },
  {
    id: 'hiit15',
    name: 'HIIT Fatburner',
    level: 'Fortgeschritten',
    description: 'Intensive Intervalle – bringt den Puls schnell nach oben.',
    rounds: 3,
    icon: 'fire',
    steps: [
      { exerciseId: 'burpees', sec: 40 },
      { exerciseId: 'high_knees', sec: 40 },
      { exerciseId: 'mountain_climbers', sec: 40 },
      { exerciseId: 'jumping_jacks', sec: 40 },
      { exerciseId: 'squats', sec: 40 },
    ],
  },
  {
    id: 'upper',
    name: 'Oberkörper Power',
    level: 'Mittel',
    description: 'Brust, Schultern und Arme – nur mit dem eigenen Körpergewicht.',
    rounds: 3,
    icon: 'arm-flex',
    steps: [
      { exerciseId: 'pushups', sec: 30 },
      { exerciseId: 'triceps_dips_chair', sec: 30 },
      { exerciseId: 'knee_pushups', sec: 30 },
      { exerciseId: 'plank', sec: 30 },
    ],
  },
  {
    id: 'legs',
    name: 'Beine & Po',
    level: 'Mittel',
    description: 'Kräftigt Oberschenkel, Waden und Gesäß.',
    rounds: 3,
    icon: 'human-handsdown',
    steps: [
      { exerciseId: 'squats', sec: 40 },
      { exerciseId: 'lunges', sec: 40 },
      { exerciseId: 'glute_bridge', sec: 40 },
      { exerciseId: 'wall_sit', sec: 30 },
    ],
  },
  {
    id: 'stretch',
    name: 'Entspannt dehnen',
    level: 'Anfänger',
    description: 'Ruhige Mobilisation – perfekt nach dem Training oder am Abend.',
    rounds: 1,
    icon: 'meditation',
    steps: [
      { exerciseId: 'stretching', sec: 60 },
      { exerciseId: 'yoga', sec: 60 },
      { exerciseId: 'superman', sec: 30 },
      { exerciseId: 'stretching', sec: 60 },
    ],
  },
];

export function getPlan(id: string): WorkoutPlan | undefined {
  return WORKOUT_PLANS.find((p) => p.id === id);
}

export function planDurationSec(plan: WorkoutPlan, workSec: number, restSec: number): number {
  const perRound = plan.steps.reduce((s, st) => s + (st.sec ?? workSec), 0);
  const restCount = plan.steps.length * plan.rounds - 1;
  return perRound * plan.rounds + Math.max(0, restCount) * restSec;
}

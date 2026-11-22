import {
  currentStreak,
  daysMeetingWaterGoal,
  daysOnCalorieTarget,
  latestWeightKg,
  longestStreak,
  totalReps,
} from './selectors';
import type { AppState } from './types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** returns [current, target] */
  progress: (s: AppState) => [number, number];
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_food',
    title: 'Erster Eintrag',
    description: 'Trage dein erstes Lebensmittel ein.',
    icon: 'food-apple',
    progress: (s) => [Math.min(1, s.foodLog.length), 1],
  },
  {
    id: 'first_scan',
    title: 'Scanner-Profi',
    description: 'Scanne deinen ersten Barcode.',
    icon: 'barcode-scan',
    progress: (s) => [Math.min(1, s.stats.scans), 1],
  },
  {
    id: 'scans_25',
    title: 'Etiketten-Leser',
    description: 'Scanne 25 Barcodes.',
    icon: 'barcode',
    progress: (s) => [Math.min(25, s.stats.scans), 25],
  },
  {
    id: 'streak_3',
    title: 'Dranbleiben',
    description: '3 Tage in Folge aktiv.',
    icon: 'fire',
    progress: (s) => [Math.min(3, Math.max(currentStreak(s), longestStreak(s))), 3],
  },
  {
    id: 'streak_7',
    title: 'Eine Woche stark',
    description: '7 Tage in Folge aktiv.',
    icon: 'fire',
    progress: (s) => [Math.min(7, Math.max(currentStreak(s), longestStreak(s))), 7],
  },
  {
    id: 'streak_30',
    title: 'Gewohnheit',
    description: '30 Tage in Folge aktiv.',
    icon: 'trophy',
    progress: (s) => [Math.min(30, Math.max(currentStreak(s), longestStreak(s))), 30],
  },
  {
    id: 'water_7',
    title: 'Hydriert',
    description: 'Erreiche an 7 Tagen dein Wasserziel.',
    icon: 'cup-water',
    progress: (s) => [Math.min(7, daysMeetingWaterGoal(s)), 7],
  },
  {
    id: 'pushups_100',
    title: '100 Liegestütze',
    description: 'Schaffe insgesamt 100 Liegestütze.',
    icon: 'arm-flex',
    progress: (s) => [Math.min(100, totalReps(s, 'pushups')), 100],
  },
  {
    id: 'pushups_1000',
    title: 'Liegestütz-Maschine',
    description: 'Schaffe insgesamt 1.000 Liegestütze.',
    icon: 'arm-flex-outline',
    progress: (s) => [Math.min(1000, totalReps(s, 'pushups')), 1000],
  },
  {
    id: 'squats_500',
    title: 'Beine aus Stahl',
    description: 'Schaffe insgesamt 500 Kniebeugen.',
    icon: 'human-handsdown',
    progress: (s) => [Math.min(500, totalReps(s, 'squats')), 500],
  },
  {
    id: 'workouts_10',
    title: 'Trainingsfleißig',
    description: 'Trage 10 Trainingseinheiten ein.',
    icon: 'dumbbell',
    progress: (s) => [Math.min(10, s.workouts.length), 10],
  },
  {
    id: 'guided_5',
    title: 'Coach-Liebling',
    description: 'Schließe 5 geführte Workouts ab.',
    icon: 'timer-outline',
    progress: (s) => [Math.min(5, s.stats.guidedWorkouts), 5],
  },
  {
    id: 'calorie_7',
    title: 'Punktlandung',
    description: 'Lande an 7 Tagen im Kalorienziel (±10 %).',
    icon: 'target',
    progress: (s) => [Math.min(7, daysOnCalorieTarget(s)), 7],
  },
  {
    id: 'weight_logged',
    title: 'Auf der Waage',
    description: 'Trage 5 Mal dein Gewicht ein.',
    icon: 'scale-bathroom',
    progress: (s) => [Math.min(5, s.weights.length), 5],
  },
  {
    id: 'fasting_first',
    title: 'Faster',
    description: 'Schließe dein erstes Intervallfasten erfolgreich ab.',
    icon: 'timer-sand',
    progress: (s) => [
      Math.min(1, s.fasting.history.filter((f) => f.end && (f.end - f.start) / 3600000 >= f.targetHours).length),
      1,
    ],
  },
  {
    id: 'goal_weight',
    title: 'Ziel erreicht!',
    description: 'Erreiche dein Wunschgewicht.',
    icon: 'flag-checkered',
    progress: (s) => {
      if (s.weights.length === 0) return [0, 1];
      const cur = latestWeightKg(s);
      const p = s.profile;
      const reached =
        p.goal === 'lose'
          ? cur <= p.targetWeightKg
          : p.goal === 'gain'
            ? cur >= p.targetWeightKg
            : Math.abs(cur - p.targetWeightKg) <= 1;
      return [reached ? 1 : 0, 1];
    },
  },
];

export function isUnlocked(a: Achievement, s: AppState): boolean {
  const [cur, target] = a.progress(s);
  return cur >= target;
}

/** returns ids of achievements that are now unlocked but weren't recorded yet */
export function newlyUnlocked(s: AppState): string[] {
  return ACHIEVEMENTS.filter((a) => !s.unlockedAchievements[a.id] && isUnlocked(a, s)).map((a) => a.id);
}

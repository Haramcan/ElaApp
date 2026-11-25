import { completedSets, getGymExercise } from './gym';
import type { AppState, MuscleGroup } from './types';

export const MAP_MUSCLES: MuscleGroup[] = ['brust', 'ruecken', 'schultern', 'arme', 'bauch', 'beine', 'po'];

/** recommended hard sets per muscle group and week */
export const WEEKLY_SET_TARGET = { min: 8, max: 20 };

export interface MuscleStat {
  muscle: MuscleGroup;
  sets: number;
  lastTrained?: number;
  /** hours since last training */
  hoursAgo?: number;
  status: 'fresh' | 'recovering' | 'ready' | 'never';
}

export function muscleStats(state: AppState, now: number = Date.now(), days = 7): Record<MuscleGroup, MuscleStat> {
  const since = now - days * 86400000;
  const out = {} as Record<MuscleGroup, MuscleStat>;
  const all: MuscleGroup[] = ['brust', 'ruecken', 'schultern', 'beine', 'po', 'arme', 'bauch', 'ganzkoerper'];
  for (const m of all) out[m] = { muscle: m, sets: 0, status: 'never' };

  for (const s of state.gym.sessions) {
    const t = s.end ?? s.start;
    for (const log of s.exercises) {
      const ex = getGymExercise(state, log.exerciseId);
      if (!ex) continue;
      const n = completedSets(log).length;
      if (n === 0) continue;
      const targets: MuscleGroup[] = ex.muscle === 'ganzkoerper' ? ['beine', 'ruecken', 'schultern'] : [ex.muscle];
      for (const m of targets) {
        const st = out[m];
        if (t >= since) st.sets += ex.muscle === 'ganzkoerper' ? n / 2 : n;
        if (!st.lastTrained || t > st.lastTrained) st.lastTrained = t;
      }
    }
  }
  for (const st of Object.values(out)) {
    st.sets = Math.round(st.sets * 10) / 10;
    if (st.lastTrained) {
      st.hoursAgo = Math.max(0, (now - st.lastTrained) / 3600000);
      st.status = st.hoursAgo < 24 ? 'fresh' : st.hoursAgo < 60 ? 'recovering' : 'ready';
    }
  }
  return out;
}

export const STATUS_LABELS: Record<MuscleStat['status'], string> = {
  fresh: 'Gerade trainiert – Pause',
  recovering: 'Erholt sich',
  ready: 'Bereit',
  never: 'Noch nicht trainiert',
};

/** 0–3 intensity level for the body map */
export function intensity(sets: number): 0 | 1 | 2 | 3 {
  if (sets <= 0) return 0;
  if (sets < 6) return 1;
  if (sets < 12) return 2;
  return 3;
}

/** muscle groups that are ready and under the weekly minimum – good candidates for the next workout */
export function recommendedMuscles(stats: Record<MuscleGroup, MuscleStat>): MuscleGroup[] {
  return MAP_MUSCLES.filter((m) => stats[m].status !== 'fresh' && stats[m].status !== 'recovering' && stats[m].sets < WEEKLY_SET_TARGET.min).sort(
    (a, b) => stats[a].sets - stats[b].sets,
  );
}

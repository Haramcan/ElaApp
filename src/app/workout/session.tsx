import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '../../components/charts';
import { Button, Card, EmptyState, Icon, IconButton, Row, Txt } from '../../components/ui';
import { formatNumber, metKcal } from '../../lib/calc';
import { dateKey, formatClock } from '../../lib/date';
import { getExercise, getPlan, type WorkoutPlan } from '../../lib/exercises';
import { confirm, useHaptics } from '../../lib/platform';
import { latestWeightKg } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

interface Phase {
  type: 'countdown' | 'work' | 'rest';
  sec: number;
  exerciseId?: string;
  /** next exercise (for rest phases) */
  nextId?: string;
  round: number;
  index: number;
}

function buildPhases(plan: WorkoutPlan, work: number, rest: number, countdown: boolean): Phase[] {
  const phases: Phase[] = [];
  if (countdown) phases.push({ type: 'countdown', sec: 5, nextId: plan.steps[0]?.exerciseId, round: 1, index: 0 });
  const total = plan.steps.length * plan.rounds;
  let n = 0;
  for (let r = 1; r <= plan.rounds; r++) {
    plan.steps.forEach((s, i) => {
      n++;
      phases.push({ type: 'work', sec: s.sec ?? work, exerciseId: s.exerciseId, round: r, index: i });
      if (n < total && rest > 0) {
        const next = plan.steps[(i + 1) % plan.steps.length];
        phases.push({ type: 'rest', sec: rest, nextId: next.exerciseId, round: r, index: i });
      }
    });
  }
  return phases;
}

const KEEP_AWAKE_TAG = 'fitlife-workout';

/** Keeps the screen on during a workout; errors (e.g. unsupported browsers) are ignored */
function KeepAwake() {
  useEffect(() => {
    let cancelled = false;
    const activation = activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
      cancelled = true;
    });
    return () => {
      void activation.then(() => {
        if (cancelled) return;
        try {
          void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
        } catch {
          // ignore
        }
      });
    };
  }, []);
  return null;
}

export default function Session() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const plan = id ? getPlan(id) : undefined;
  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <EmptyState icon="alert-circle-outline" title="Workout nicht gefunden">
          <Button title="Zurück" onPress={() => router.back()} full={false} />
        </EmptyState>
      </SafeAreaView>
    );
  }
  return <SessionInner plan={plan} />;
}

function SessionInner({ plan }: { plan: WorkoutPlan }) {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const settings = state.settings;
  const phases = useMemo(
    () => buildPhases(plan, settings.workoutWorkSec, settings.workoutRestSec, settings.countdownBeforeWorkout),
    // settings are frozen for the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan],
  );
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(phases[0]?.sec ?? 0);
  const [done, setDone] = useState(false);
  const endAt = useRef(0);
  const elapsedWork = useRef(0);
  const lastBeep = useRef(-1);
  const saved = useRef(false);
  const idxRef = useRef(0);

  const phase = phases[idx];

  useEffect(() => {
    endAt.current = Date.now() + (phases[0]?.sec ?? 0) * 1000;
  }, [phases]);

  const goTo = useCallback(
    (next: number) => {
      if (next >= phases.length) {
        idxRef.current = phases.length;
        setDone(true);
        haptics.success();
        return;
      }
      const p = phases[Math.max(0, next)];
      idxRef.current = Math.max(0, next);
      setIdx(Math.max(0, next));
      setRemaining(p.sec);
      endAt.current = Date.now() + p.sec * 1000;
      lastBeep.current = -1;
      if (p.type === 'work') haptics.medium();
      else haptics.tap();
    },
    [phases, haptics],
  );

  useEffect(() => {
    if (paused || done) return;
    const t = setInterval(() => {
      if (idxRef.current !== idx) return;
      const left = Math.max(0, (endAt.current - Date.now()) / 1000);
      setRemaining(left);
      const whole = Math.ceil(left);
      if (whole <= 3 && whole > 0 && whole !== lastBeep.current) {
        lastBeep.current = whole;
        haptics.tap();
      }
      if (left <= 0) {
        if (phases[idx]?.type === 'work') elapsedWork.current += phases[idx].sec;
        goTo(idx + 1);
      }
    }, 200);
    return () => clearInterval(t);
  }, [paused, done, idx, goTo, phases, haptics]);

  const togglePause = () => {
    if (paused) {
      endAt.current = Date.now() + remaining * 1000;
      setPaused(false);
    } else {
      setPaused(true);
    }
  };

  const totalSec = phases.filter((p) => p.type !== 'countdown').reduce((s, p) => s + p.sec, 0);
  const mets = plan.steps.map((s) => getExercise(s.exerciseId)?.met ?? 5);
  const avgMet = mets.reduce((a, b) => a + b, 0) / mets.length;

  const finish = (partial: boolean) => {
    if (saved.current) return;
    saved.current = true;
    const workSec = partial ? elapsedWork.current : phases.filter((p) => p.type === 'work').reduce((s, p) => s + p.sec, 0);
    const restSec = partial ? 0 : phases.filter((p) => p.type === 'rest').reduce((s, p) => s + p.sec, 0);
    const minutes = (workSec + restSec) / 60;
    if (minutes >= 1) {
      actions.addWorkout({
        date: dateKey(),
        exerciseId: 'hiit',
        name: plan.name,
        durationMin: Math.round(minutes * 10) / 10,
        kcal: metKcal(avgMet, latestWeightKg(state), workSec / 60) + metKcal(2, latestWeightKg(state), restSec / 60),
        note: partial ? 'Vorzeitig beendet' : undefined,
      });
      if (!partial) actions.incrementStat('guidedWorkouts');
    }
  };

  const exit = async () => {
    if (done) {
      router.back();
      return;
    }
    setPaused(true);
    const ok = await confirm('Workout beenden?', 'Bisher absolvierte Übungen werden gespeichert (ab 1 Minute).', 'Beenden', true);
    if (ok) {
      finish(true);
      router.back();
    } else {
      endAt.current = Date.now() + remaining * 1000;
      setPaused(false);
    }
  };

  if (done) {
    const kcal = metKcal(avgMet, latestWeightKg(state), totalSec / 60);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trophy" size={52} color={colors.primary} />
          </View>
          <Txt variant="title" center>
            Geschafft! 🎉
          </Txt>
          <Txt center color={colors.textSecondary}>
            Du hast „{plan.name}“ abgeschlossen.
          </Txt>
        </View>
        <Row gap={10}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="h2">{formatClock(totalSec)}</Txt>
            <Txt variant="caption">Dauer</Txt>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="h2">≈ {formatNumber(kcal)}</Txt>
            <Txt variant="caption">kcal</Txt>
          </Card>
        </Row>
        <Button
          title="Speichern & schließen"
          icon="check"
          testID="session-finish"
          onPress={() => {
            finish(false);
            router.back();
          }}
        />
      </SafeAreaView>
    );
  }

  const ex = getExercise(phase.exerciseId ?? phase.nextId ?? '');
  const isWork = phase.type === 'work';
  const accent = isWork ? colors.primary : phase.type === 'rest' ? colors.water : colors.warning;
  const workPhases = phases.filter((p) => p.type === 'work');
  const workIdx = phases.slice(0, idx + 1).filter((p) => p.type === 'work').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      {settings.keepScreenOn ? <KeepAwake /> : null}
      <Row justify="space-between" style={{ paddingHorizontal: 12 }}>
        <IconButton icon="close" label="Workout beenden" onPress={() => void exit()} testID="session-exit" />
        <Txt variant="h3">{plan.name}</Txt>
        <Txt variant="small" style={{ minWidth: 40, textAlign: 'right' }}>
          {Math.min(workIdx, workPhases.length)}/{workPhases.length}
        </Txt>
      </Row>
      <View style={{ height: 4, backgroundColor: colors.track, marginHorizontal: 16, borderRadius: 2, marginTop: 8 }}>
        <View style={{ width: `${(idx / phases.length) * 100}%`, height: 4, backgroundColor: colors.primary, borderRadius: 2 }} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 }}>
        <Txt variant="label" color={accent}>
          {phase.type === 'countdown' ? 'Mach dich bereit' : isWork ? `Runde ${phase.round} von ${plan.rounds}` : 'Pause'}
        </Txt>
        <Txt variant="title" center testID="session-exercise">
          {isWork ? ex?.name : `Gleich: ${ex?.name ?? ''}`}
        </Txt>
        <ProgressRing size={230} stroke={16} progress={phase.sec > 0 ? 1 - remaining / phase.sec : 1} color={accent}>
          <Txt style={{ fontSize: 64, lineHeight: 76, fontWeight: '800', fontVariant: ['tabular-nums'] }} testID="session-timer">
            {Math.ceil(remaining)}
          </Txt>
          <Txt variant="caption">Sekunden</Txt>
        </ProgressRing>
        {ex?.tip ? (
          <Txt center color={colors.textSecondary} style={{ maxWidth: 320 }}>
            {ex.tip}
          </Txt>
        ) : null}
      </View>

      <Row justify="center" gap={28} style={{ paddingBottom: 24 }}>
        <IconButton icon="skip-previous" size={30} label="Zurück" onPress={() => goTo(Math.max(0, idx - 1))} disabled={idx === 0} bg={colors.card} />
        <IconButton icon={paused ? 'play' : 'pause'} size={40} label={paused ? 'Fortsetzen' : 'Pause'} onPress={togglePause} bg={colors.primary} color={colors.onPrimary} testID="session-pause" />
        <IconButton
          icon="skip-next"
          size={30}
          label="Überspringen"
          testID="session-skip"
          onPress={() => {
            if (phase.type === 'work') elapsedWork.current += Math.max(0, phase.sec - remaining);
            goTo(idx + 1);
          }}
          bg={colors.card}
        />
      </Row>
    </SafeAreaView>
  );
}

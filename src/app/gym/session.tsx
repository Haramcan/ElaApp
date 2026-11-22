import { router, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RestTimer, SetField, useStartGym } from '../../components/gym';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Icon, IconButton, Row, Txt } from '../../components/ui';
import { displayWeight, formatNumber, toKg } from '../../lib/calc';
import { formatClock } from '../../lib/date';
import {
  completedSets,
  formatSets,
  getGymExercise,
  lastPerformance,
  personalRecords,
  sessionSetCount,
  sessionVolume,
  suggestNext,
} from '../../lib/gym';
import { useNow } from '../../lib/hooks';
import { confirm, useHaptics } from '../../lib/platform';
import { latestWeightKg } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { radius, useTheme } from '../../lib/theme';
import type { GymExerciseLog, GymSession } from '../../lib/types';

export default function GymSessionScreen() {
  const { state } = useStore();
  const start = useStartGym();
  const active = state.gym.active;
  if (!active) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <EmptyState icon="weight-lifter" title="Kein Training aktiv" text="Starte ein freies Training oder einen Tag aus deinem Trainingsplan.">
          <Button title="Freies Training starten" icon="play" full={false} onPress={() => void start()} testID="gym-empty-start" />
          <Button title="Zur Übersicht" variant="ghost" full={false} onPress={() => router.replace('/gym')} />
        </EmptyState>
      </SafeAreaView>
    );
  }
  return <ActiveSession session={active} />;
}

function ActiveSession({ session }: { session: GymSession }) {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const now = useNow(1000);
  const [rest, setRest] = useState<{ endAt: number; total: number } | null>(null);
  const wu = state.settings.weightUnit;

  const startRest = useCallback(
    (sec: number) => {
      if (!state.settings.gymAutoRest || sec <= 0) return;
      setRest({ endAt: Date.now() + sec * 1000, total: sec });
    },
    [state.settings.gymAutoRest],
  );

  const finish = async () => {
    const doneSets = sessionSetCount(session);
    const openWithReps = session.exercises.reduce((n, l) => n + l.sets.filter((s) => !s.done && (s.reps ?? 0) > 0).length, 0);
    if (doneSets === 0) {
      const ok = await confirm('Training verwerfen?', 'Du hast noch keinen Satz abgehakt. Das Training wird nicht gespeichert.', 'Verwerfen', true);
      if (!ok) return;
      actions.discardGymSession();
      router.back();
      return;
    }
    const msg =
      openWithReps > 0
        ? `${doneSets} Sätze werden gespeichert. ${openWithReps} eingetragene Sätze sind nicht abgehakt und werden verworfen.`
        : `${doneSets} Sätze werden gespeichert.`;
    if (!(await confirm('Training beenden?', msg, 'Beenden'))) return;
    const prs = personalRecords(state, session);
    const id = session.id;
    actions.finishGymSession(latestWeightKg(state));
    haptics.success();
    if (prs.length > 0) {
      const names = prs.map((p) => getGymExercise(state, p.exerciseId)?.name ?? '').filter(Boolean);
      toast({ message: `Neuer Rekord: ${names.slice(0, 2).join(', ')}${names.length > 2 ? ' …' : ''} 🏆`, icon: 'trophy', duration: 4000 });
    } else {
      toast({ message: 'Training gespeichert – stark! 💪', icon: 'check' });
    }
    router.replace({ pathname: '/gym/session-detail', params: { id } });
  };

  const discard = async () => {
    if (await confirm('Training verwerfen?', 'Alle Einträge dieses Trainings werden gelöscht.', 'Verwerfen', true)) {
      actions.discardGymSession();
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          title: session.name,
          headerRight: () => (
            <Pressable onPress={() => void finish()} hitSlop={8} accessibilityRole="button" testID="gym-finish-header" style={{ paddingHorizontal: 8 }}>
              <Txt bold color={colors.primary}>
                Beenden
              </Txt>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: rest ? 140 : 48 }} keyboardShouldPersistTaps="handled">
        <Card style={{ padding: 12 }}>
          <Row justify="space-between">
            <Stat label="Dauer" value={formatClock(Math.max(0, (now - session.start) / 1000))} />
            <Stat label="Sätze" value={String(sessionSetCount(session))} />
            <Stat label="Volumen" value={`${formatNumber(displayWeight(sessionVolume(session), wu))} ${wu}`} />
          </Row>
        </Card>
        <Row gap={6} style={{ paddingHorizontal: 4 }}>
          <Icon name="pencil-outline" size={14} color={colors.muted} />
          <TextInput
          value={session.name}
          onChangeText={(t) => actions.updateActiveSession({ name: t })}
          accessibilityLabel="Name des Trainings"
          maxLength={40}
          style={[
            { flex: 1, color: colors.textSecondary, fontSize: 13 },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
        />
        </Row>

        {session.exercises.length === 0 ? (
          <Card>
            <Txt variant="small" center>
              Füge deine erste Übung bzw. dein erstes Gerät hinzu.
            </Txt>
          </Card>
        ) : null}

        {session.exercises.map((log, i) => (
          <ExerciseCard
            key={log.key}
            log={log}
            index={i}
            count={session.exercises.length}
            onSetDone={(restSec) => startRest(restSec)}
          />
        ))}

        <Button title="Übung / Gerät hinzufügen" icon="plus" variant="soft" onPress={() => router.push({ pathname: '/gym/exercises', params: { mode: 'session' } })} testID="gym-add-exercise" />
        <Button title="Training beenden" icon="flag-checkered" onPress={() => void finish()} testID="gym-finish" />
        <Button title="Training verwerfen" variant="ghost" onPress={() => void discard()} />
      </ScrollView>
      {rest ? (
        <RestTimer endAt={rest.endAt} total={rest.total} onChange={(e) => setRest(e == null ? null : { endAt: e, total: Math.max(rest.total, Math.ceil((e - Date.now()) / 1000)) })} />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      <Txt variant="caption">{label}</Txt>
    </View>
  );
}

function ExerciseCard({ log, index, count, onSetDone }: { log: GymExerciseLog; index: number; count: number; onSetDone: (restSec: number) => void }) {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const wu = state.settings.weightUnit;
  const ex = getGymExercise(state, log.exerciseId);
  const last = lastPerformance(state, log.exerciseId);
  const lastSets = last ? completedSets(last.log) : [];
  const sug = suggestNext(last?.log, { repsMin: log.repsMin, repsMax: log.repsMax, step: state.settings.gymWeightStep, bodyweight: ex?.bodyweight });
  const note = state.gym.notes[log.exerciseId] ?? '';
  const [showNote, setShowNote] = useState(note.length > 0);
  const fmtW = (kg: number) => `${formatNumber(displayWeight(kg, wu), 1)}`;
  const repsHint = log.repsMin && log.repsMax ? `${log.repsMin}–${log.repsMax}` : undefined;
  const testBase = `gym-ex-${index}`;

  const update = (fn: (l: GymExerciseLog) => GymExerciseLog) => actions.updateActiveLog(log.key, fn);
  const setValue = (i: number, patch: Partial<GymExerciseLog['sets'][number]>) =>
    update((l) => ({ ...l, sets: l.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const toggleDone = (i: number) => {
    const s = log.sets[i];
    if (!s.done) {
      const reps = s.reps ?? lastSets[i]?.reps ?? sug.reps;
      if (!reps || reps <= 0) return;
      setValue(i, { done: true, reps });
      haptics.medium();
      onSetDone(log.restSec ?? state.settings.gymRestSec);
    } else {
      setValue(i, { done: false });
    }
  };

  const badge =
    sug.kind === 'increase'
      ? { label: 'Steigern ↑', color: colors.success, bg: colors.primarySoft }
      : sug.kind === 'reduce'
        ? { label: 'Leichter', color: colors.warning, bg: colors.warningSoft }
        : sug.kind === 'first'
          ? { label: 'Neu', color: colors.water, bg: colors.waterSoft }
          : { label: 'Halten', color: colors.textSecondary, bg: colors.cardAlt };

  return (
    <Card style={{ gap: 10, padding: 14 }} testID={testBase}>
      <Row gap={6} align="flex-start">
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/gym/exercise', params: { id: log.exerciseId } })} accessibilityRole="button">
          <Txt variant="h3" numberOfLines={2}>
            {ex?.name ?? 'Gelöschte Übung'}
          </Txt>
          {last ? (
            <Txt variant="caption" numberOfLines={2} testID={`${testBase}-last`}>
              Letztes Mal ({new Date(last.session.start).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}):{' '}
              {formatSets(last.log, (kg) => `${fmtW(kg)} ${wu}`)}
            </Txt>
          ) : (
            <Txt variant="caption">Noch nie gemacht</Txt>
          )}
        </Pressable>
        <IconButton icon="arrow-up" size={18} label="Nach oben" onPress={() => actions.moveActiveLog(log.key, -1)} disabled={index === 0} />
        <IconButton icon="arrow-down" size={18} label="Nach unten" onPress={() => actions.moveActiveLog(log.key, 1)} disabled={index === count - 1} />
        <IconButton
          icon="delete-outline"
          size={18}
          color={colors.danger}
          label="Übung entfernen"
          onPress={async () => {
            if (log.sets.some((s) => s.done)) {
              if (!(await confirm('Übung entfernen?', 'Bereits abgehakte Sätze dieser Übung gehen verloren.', 'Entfernen', true))) return;
            }
            actions.removeActiveLog(log.key);
          }}
        />
      </Row>

      <Row gap={8} align="flex-start">
        <Badge label={badge.label} color={badge.color} bg={badge.bg} />
        <Txt variant="caption" style={{ flex: 1 }} testID={`${testBase}-suggestion`}>
          {sug.kind === 'increase' && sug.weightKg != null
            ? `Alle Sätze geschafft – heute ${fmtW(sug.weightKg)} ${wu} probieren! 💪`
            : sug.kind === 'reduce' && sug.weightKg != null
              ? `Letztes Mal war es zu schwer – heute ${fmtW(sug.weightKg)} ${wu} mit sauberer Technik.`
              : sug.kind === 'repeat' && sug.weightKg != null
                ? `Bleib bei ${fmtW(sug.weightKg)} ${wu} und schaffe ${log.repsMax ?? 12} Wdh. pro Satz – dann steigern.`
                : sug.text}
        </Txt>
      </Row>

      {showNote ? (
        <Row gap={6} style={{ backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: 10 }}>
          <Icon name="cog-outline" size={16} color={colors.muted} />
          <TextInput
            value={note}
            onChangeText={(t) => actions.setGymNote(log.exerciseId, t)}
            placeholder="Einstellung, z. B. Sitz 4, Lehne 2"
            placeholderTextColor={colors.muted}
            maxLength={80}
            accessibilityLabel="Geräte-Einstellung"
            style={[{ flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
          />
        </Row>
      ) : (
        <Pressable onPress={() => setShowNote(true)} accessibilityRole="button" hitSlop={6}>
          <Txt variant="caption" color={colors.primary} bold>
            + Geräte-Einstellung notieren
          </Txt>
        </Pressable>
      )}

      {/* set table */}
      <Row gap={8}>
        <Txt variant="caption" style={{ width: 26, textAlign: 'center' }}>
          Satz
        </Txt>
        <Txt variant="caption" style={{ flex: 1.2, textAlign: 'center' }}>
          Vorher
        </Txt>
        <Txt variant="caption" style={{ flex: 1, textAlign: 'center' }}>
          {wu}
        </Txt>
        <Txt variant="caption" style={{ flex: 1, textAlign: 'center' }}>
          Wdh.
        </Txt>
        <View style={{ width: 40 }} />
      </Row>
      {log.sets.map((s, i) => {
        const prev = lastSets[i];
        return (
          <Row key={i} gap={8}>
            <Txt bold style={{ width: 26, textAlign: 'center' }} color={s.done ? colors.success : colors.text}>
              {i + 1}
            </Txt>
            <Pressable
              style={{ flex: 1.2 }}
              disabled={!prev}
              accessibilityRole="button"
              accessibilityLabel="Werte vom letzten Mal übernehmen"
              onPress={() => prev && setValue(i, { weightKg: prev.weightKg, reps: prev.reps })}
            >
              <Txt variant="small" center color={colors.muted}>
                {prev ? `${(prev.weightKg ?? 0) > 0 ? fmtW(prev.weightKg ?? 0) : 'KG'} × ${prev.reps}` : '–'}
              </Txt>
            </Pressable>
            <SetField
              label={`Satz ${i + 1} Gewicht`}
              testID={`${testBase}-w-${i}`}
              value={s.weightKg == null ? null : displayWeight(s.weightKg, wu)}
              onChange={(v) => setValue(i, { weightKg: v == null ? null : Math.round(toKg(v, wu) * 100) / 100 })}
              placeholder={ex?.bodyweight ? 'KG' : '0'}
              done={s.done}
            />
            <SetField
              label={`Satz ${i + 1} Wiederholungen`}
              testID={`${testBase}-r-${i}`}
              value={s.reps}
              decimals={0}
              onChange={(v) => setValue(i, { reps: v == null ? null : Math.round(v) })}
              placeholder={prev?.reps ? String(prev.reps) : (repsHint ?? String(sug.reps))}
              done={s.done}
            />
            <Pressable
              testID={`${testBase}-done-${i}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
              accessibilityLabel={`Satz ${i + 1} erledigt`}
              onPress={() => toggleDone(i)}
              style={{
                width: 40,
                height: 38,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: s.done ? colors.primary : colors.cardAlt,
              }}
            >
              <Icon name="check" size={20} color={s.done ? colors.onPrimary : colors.muted} />
            </Pressable>
          </Row>
        );
      })}
      <Row gap={8}>
        <Button
          small
          title="+ Satz"
          variant="soft"
          full={false}
          style={{ flex: 1 }}
          testID={`${testBase}-add-set`}
          onPress={() =>
            update((l) => {
              const lastSet = l.sets[l.sets.length - 1];
              return { ...l, sets: [...l.sets, { weightKg: lastSet?.weightKg ?? sug.weightKg, reps: null, done: false }] };
            })
          }
        />
        <Button
          small
          title="− Satz"
          variant="secondary"
          full={false}
          style={{ flex: 1 }}
          disabled={log.sets.length <= 1}
          onPress={() => update((l) => ({ ...l, sets: l.sets.slice(0, -1) }))}
        />
      </Row>
      {ex?.tip ? <Txt variant="caption">💡 {ex.tip}</Txt> : null}
    </Card>
  );
}

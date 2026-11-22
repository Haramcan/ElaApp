import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Icon, Input, NumberInput, Row, Screen, Txt } from '../../components/ui';
import { energyValue, formatNumber, metKcal } from '../../lib/calc';
import { addDays, formatDayLabel } from '../../lib/date';
import { CATEGORY_LABELS, EXERCISES, type ExerciseCategory, getExercise, repsToMinutes } from '../../lib/exercises';
import { normalize } from '../../lib/foods';
import { useToday } from '../../lib/hooks';
import { useHaptics } from '../../lib/platform';
import { latestWeightKg } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function LogWorkout() {
  const params = useLocalSearchParams<{ exercise?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const today = useToday();
  const [exerciseId, setExerciseId] = useState<string | null>(params.exercise && getExercise(params.exercise) ? params.exercise : null);
  const [filter, setFilter] = useState<ExerciseCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [minutes, setMinutes] = useState<number | null>(30);
  const [reps, setReps] = useState<number | null>(10);
  const [sets, setSets] = useState<number | null>(1);
  const [distance, setDistance] = useState<number | null>(null);
  const [manualKcal, setManualKcal] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);

  const ex = exerciseId ? getExercise(exerciseId) : undefined;
  const weight = latestWeightKg(state);

  const list = useMemo(() => {
    const q = normalize(query);
    return EXERCISES.filter((e) => (filter === 'all' || e.category === filter) && (!q || normalize(e.name).includes(q)));
  }, [filter, query]);

  const totalReps = ex?.kind === 'reps' ? (reps ?? 0) * (sets ?? 1) : undefined;
  const duration = (() => {
    if (!ex) return 0;
    if (ex.kind === 'reps') return Math.max(1, Math.round(repsToMinutes(ex, totalReps ?? 0) * 10) / 10);
    if (ex.kind === 'distance' && distance && distance > 0 && (minutes == null || minutes <= 0)) {
      return Math.round((distance / (ex.speedKmh ?? 5)) * 60);
    }
    return minutes ?? 0;
  })();
  const estimated = ex ? metKcal(ex.met, weight, duration) : 0;
  const kcal = manualKcal ?? estimated;
  const valid = !!ex && duration > 0 && duration <= 1440 && kcal >= 0 && (ex.kind !== 'reps' || (totalReps ?? 0) > 0);

  const save = () => {
    if (!ex || !valid) return;
    actions.addWorkout({
      date,
      exerciseId: ex.id,
      name: ex.name,
      durationMin: Math.round(duration * 10) / 10,
      kcal: Math.round(kcal),
      reps: totalReps,
      sets: ex.kind === 'reps' ? (sets ?? 1) : undefined,
      distanceKm: ex.kind === 'distance' && distance ? distance : undefined,
      note: note.trim() || undefined,
    });
    haptics.success();
    toast({ message: `${ex.name} eingetragen (${formatNumber(kcal)} kcal)`, icon: 'check' });
    router.back();
  };

  if (!ex) {
    return (
      <Screen edges={['bottom']}>
        <Input placeholder="Übung oder Sportart suchen …" value={query} onChangeText={setQuery} testID="exercise-search" />
        <Row gap={6} wrap>
          <Chip label="Alle" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {(Object.keys(CATEGORY_LABELS) as ExerciseCategory[]).map((c) => (
            <Chip key={c} label={CATEGORY_LABELS[c]} selected={filter === c} onPress={() => setFilter(c)} />
          ))}
        </Row>
        <Card padded={false}>
          {list.map((e, i) => (
            <Pressable
              key={e.id}
              testID={`exercise-${e.id}`}
              accessibilityRole="button"
              onPress={() => {
                setExerciseId(e.id);
                setManualKcal(null);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name={e.icon} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Txt bold>{e.name}</Txt>
                <Txt variant="caption">
                  {CATEGORY_LABELS[e.category]} · ca. {formatNumber(metKcal(e.met, weight, 30))} kcal / 30 min
                </Txt>
              </View>
              <Icon name="chevron-right" color={colors.muted} />
            </Pressable>
          ))}
          {list.length === 0 ? (
            <Txt variant="small" center style={{ padding: 20 }}>
              Keine Übung gefunden.
            </Txt>
          ) : null}
        </Card>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card>
          <Row gap={12}>
            <Icon name={ex.icon} size={30} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Txt variant="h2">{ex.name}</Txt>
              <Txt variant="caption">{CATEGORY_LABELS[ex.category]}</Txt>
            </View>
            <Button small title="Ändern" variant="ghost" full={false} onPress={() => setExerciseId(null)} />
          </Row>
          {ex.tip ? (
            <Txt variant="small" style={{ marginTop: 8 }}>
              💡 {ex.tip}
            </Txt>
          ) : null}
        </Card>

        <Card style={{ gap: 12 }}>
          {ex.kind === 'reps' ? (
            <Row gap={10}>
              <NumberInput testID="log-reps" style={{ flex: 1 }} label="Wiederholungen" value={reps} onChange={setReps} decimals={0} min={1} max={10000} />
              <NumberInput testID="log-sets" style={{ flex: 1 }} label="Sätze" value={sets} onChange={setSets} decimals={0} min={1} max={100} />
            </Row>
          ) : (
            <NumberInput testID="log-minutes" label="Dauer" suffix="min" value={minutes} onChange={setMinutes} decimals={0} min={1} max={1440} />
          )}
          {ex.kind === 'reps' ? (
            <Row gap={6} wrap>
              {[10, 15, 20, 25, 30, 50].map((r) => (
                <Chip key={r} label={`${r}`} selected={reps === r} onPress={() => setReps(r)} />
              ))}
            </Row>
          ) : (
            <Row gap={6} wrap>
              {[10, 15, 20, 30, 45, 60, 90].map((m) => (
                <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
              ))}
            </Row>
          )}
          {ex.kind === 'distance' ? (
            <NumberInput label="Distanz (optional)" suffix="km" value={distance} onChange={setDistance} decimals={2} min={0.01} max={500} />
          ) : null}
          <NumberInput
            label="Kalorien (optional anpassen)"
            suffix="kcal"
            value={manualKcal}
            onChange={setManualKcal}
            decimals={0}
            min={0}
            max={10000}
            placeholder={`${formatNumber(estimated)} (geschätzt)`}
            hint={`Schätzung: MET ${formatNumber(ex.met, 1)} × ${formatNumber(weight, 1)} kg × ${formatNumber(duration, 1)} min`}
          />
          <Input label="Notiz (optional)" value={note} onChangeText={setNote} maxLength={120} placeholder="z. B. Gefühl, Strecke, Gewichte …" />
        </Card>

        <Card>
          <Row justify="space-between">
            <Button small variant="ghost" title="◀" full={false} onPress={() => setDate(addDays(date, -1))} />
            <Txt bold>{formatDayLabel(date, today)}</Txt>
            <Button small variant="ghost" title="▶" full={false} onPress={() => setDate(addDays(date, 1))} disabled={date >= today} />
          </Row>
        </Card>

        <Card style={{ alignItems: 'center' }}>
          <Txt variant="caption">Verbrannt</Txt>
          <Txt variant="title" color={colors.fire}>
            {formatNumber(energyValue(kcal, state.settings.energyUnit))} {state.settings.energyUnit}
          </Txt>
          <Txt variant="caption">
            {formatNumber(duration, 1)} min{totalReps ? ` · ${totalReps} Wiederholungen` : ''}
          </Txt>
        </Card>
        <Button title="Speichern" icon="check" onPress={save} disabled={!valid} testID="log-save" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

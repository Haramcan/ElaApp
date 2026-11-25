import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { LastTimeLine, useSharePlan, useStartGym } from '../../components/gym';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, Divider, EmptyState, IconButton, Input, Row, Screen, Stepper, Txt } from '../../components/ui';
import { getGymExercise } from '../../lib/gym';
import { confirm } from '../../lib/platform';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { PlanDay, PlanExercise, TrainingPlan } from '../../lib/types';

export default function PlanEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const plan = state.gym.plans.find((p) => p.id === id);
  const share = useSharePlan();

  if (!plan) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="clipboard-alert-outline" title="Plan nicht gefunden">
          <Button title="Zu den Plänen" full={false} onPress={() => router.replace('/gym/plans')} />
        </EmptyState>
      </Screen>
    );
  }
  const active = plan.id === state.gym.activePlanId;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: 'Plan bearbeiten' }} />
        <Card style={{ gap: 10 }}>
          <Input label="Name des Plans" value={plan.name} onChangeText={(t) => actions.updatePlan(plan.id, (p) => ({ ...p, name: t }))} maxLength={50} testID="plan-name" />
          {plan.description ? <Txt variant="small">{plan.description}</Txt> : null}
          {active ? (
            <Badge label="Aktiver Plan" />
          ) : (
            <Button small variant="soft" title="Als aktiven Plan verwenden" icon="check" onPress={() => actions.setActivePlan(plan.id)} />
          )}
        </Card>

        {plan.days.map((d, i) => (
          <DayCard key={d.id} plan={plan} day={d} index={i} />
        ))}

        <Button
          title="Trainingstag hinzufügen"
          icon="plus"
          variant="soft"
          testID="plan-add-day"
          onPress={() => actions.addPlanDay(plan.id, `Tag ${String.fromCharCode(65 + Math.min(25, plan.days.length))}`)}
        />
        <Button title="Plan teilen" icon="share-variant" variant="secondary" onPress={() => void share(plan)} testID="plan-share" />
        <Button
          title="Plan löschen"
          icon="delete"
          variant="danger"
          onPress={async () => {
            if (await confirm('Plan löschen?', `„${plan.name}“ wird gelöscht. Absolvierte Trainings bleiben erhalten.`, 'Löschen', true)) {
              actions.deletePlan(plan.id);
              toast('Plan gelöscht');
              router.back();
            }
          }}
        />
        <Txt variant="caption" center color={colors.muted}>
          Änderungen werden automatisch gespeichert.
        </Txt>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function DayCard({ plan, day, index }: { plan: TrainingPlan; day: PlanDay; index: number }) {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const start = useStartGym();
  const [open, setOpen] = useState<string | null>(null);
  const update = (fn: (d: PlanDay) => PlanDay) => actions.updatePlanDay(plan.id, day.id, fn);
  const updateEx = (key: string, patch: Partial<PlanExercise>) => update((d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)) }));
  const move = (key: string, dir: -1 | 1) =>
    update((d) => {
      const list = [...d.exercises];
      const i = list.findIndex((e) => e.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, exercises: list };
    });

  return (
    <Card style={{ gap: 10 }} testID={`plan-day-${index}`}>
      <Row gap={6}>
        <View style={{ flex: 1 }}>
          <Input value={day.name} onChangeText={(t) => update((d) => ({ ...d, name: t }))} maxLength={30} accessibilityLabel="Name des Tages" />
        </View>
        <IconButton
          icon="delete-outline"
          color={colors.danger}
          label="Tag löschen"
          disabled={plan.days.length <= 1}
          onPress={async () => {
            if (await confirm('Tag löschen?', `„${day.name}“ wird aus dem Plan entfernt.`, 'Löschen', true)) actions.removePlanDay(plan.id, day.id);
          }}
        />
      </Row>
      {day.exercises.length === 0 ? <Txt variant="small">Noch keine Übungen – füge Geräte hinzu.</Txt> : null}
      {day.exercises.map((e, i) => {
        const ex = getGymExercise(state, e.exerciseId);
        const isOpen = open === e.key;
        return (
          <View key={e.key} style={{ gap: 8 }}>
            {i > 0 ? <Divider /> : null}
            <Pressable onPress={() => setOpen(isOpen ? null : e.key)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
              <Row gap={6}>
                <View style={{ flex: 1 }}>
                  <Txt bold>{ex?.name ?? 'Gelöschte Übung'}</Txt>
                  <Txt variant="caption">
                    {e.sets} Sätze × {e.repsMin}–{e.repsMax} Wdh. · {e.restSec} s Pause
                  </Txt>
                  <LastTimeLine exerciseId={e.exerciseId} />
                </View>
                <IconButton icon={isOpen ? 'chevron-up' : 'tune-variant'} size={18} label="Bearbeiten" color={colors.primary} onPress={() => setOpen(isOpen ? null : e.key)} />
              </Row>
            </Pressable>
            {isOpen ? (
              <View style={{ gap: 8, backgroundColor: colors.cardAlt, borderRadius: 12, padding: 10 }}>
                <Row justify="space-between">
                  <Txt variant="small">Sätze</Txt>
                  <Stepper value={e.sets} onChange={(v) => updateEx(e.key, { sets: v })} min={1} max={10} format={(v) => String(v)} label="Sätze" />
                </Row>
                <Row justify="space-between">
                  <Txt variant="small">Wdh. von</Txt>
                  <Stepper value={e.repsMin} onChange={(v) => updateEx(e.key, { repsMin: v, repsMax: Math.max(v, e.repsMax) })} min={1} max={50} format={(v) => String(v)} label="Wiederholungen min" />
                </Row>
                <Row justify="space-between">
                  <Txt variant="small">Wdh. bis</Txt>
                  <Stepper value={e.repsMax} onChange={(v) => updateEx(e.key, { repsMax: v, repsMin: Math.min(v, e.repsMin) })} min={1} max={50} format={(v) => String(v)} label="Wiederholungen max" />
                </Row>
                <Row justify="space-between">
                  <Txt variant="small">Pause</Txt>
                  <Stepper value={e.restSec} onChange={(v) => updateEx(e.key, { restSec: v })} step={15} min={15} max={300} format={(v) => `${v} s`} label="Pause" />
                </Row>
                <Row gap={6}>
                  <Button small variant="secondary" full={false} title="↑" onPress={() => move(e.key, -1)} disabled={i === 0} />
                  <Button small variant="secondary" full={false} title="↓" onPress={() => move(e.key, 1)} disabled={i === day.exercises.length - 1} />
                  <View style={{ flex: 1 }} />
                  <Button small variant="danger" full={false} title="Entfernen" onPress={() => update((d) => ({ ...d, exercises: d.exercises.filter((x) => x.key !== e.key) }))} />
                </Row>
              </View>
            ) : null}
          </View>
        );
      })}
      <Row gap={8}>
        <Button
          small
          variant="soft"
          title="+ Übung"
          full={false}
          style={{ flex: 1 }}
          testID={`plan-day-${index}-add`}
          onPress={() => router.push({ pathname: '/gym/exercises', params: { mode: 'plan', planId: plan.id, dayId: day.id } })}
        />
        <Button small title="Starten" icon="play" full={false} style={{ flex: 1 }} disabled={day.exercises.length === 0} onPress={() => void start({ plan, day })} testID={`plan-day-${index}-start`} />
      </Row>
    </Card>
  );
}

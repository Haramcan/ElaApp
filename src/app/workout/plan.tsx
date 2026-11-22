import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Divider, EmptyState, Icon, Row, Screen, Stepper, Txt } from '../../components/ui';
import { formatNumber, metKcal } from '../../lib/calc';
import { getExercise, getPlan, planDurationSec } from '../../lib/exercises';
import { latestWeightKg } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const plan = id ? getPlan(id) : undefined;
  if (!plan) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="alert-circle-outline" title="Workout nicht gefunden" />
      </Screen>
    );
  }
  const { workoutWorkSec: work, workoutRestSec: rest } = state.settings;
  const totalSec = planDurationSec(plan, work, rest);
  const mets = plan.steps.map((s) => getExercise(s.exerciseId)?.met ?? 5);
  const avgMet = mets.reduce((a, b) => a + b, 0) / mets.length;
  const kcal = metKcal(avgMet, latestWeightKg(state), totalSec / 60);
  const usesDefault = plan.steps.some((s) => s.sec == null);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: plan.name }} />
      <Card style={{ gap: 8 }}>
        <Txt>{plan.description}</Txt>
        <Row gap={6} wrap>
          <Badge label={plan.level} />
          <Badge label={`ca. ${Math.round(totalSec / 60)} min`} bg={colors.cardAlt} color={colors.textSecondary} />
          <Badge label={`ca. ${formatNumber(kcal)} kcal`} bg={colors.cardAlt} color={colors.textSecondary} />
          <Badge label={`${plan.rounds} ${plan.rounds === 1 ? 'Runde' : 'Runden'}`} bg={colors.cardAlt} color={colors.textSecondary} />
        </Row>
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt variant="h3">Intervalle</Txt>
        {usesDefault ? (
          <Row justify="space-between">
            <Txt>Belastung</Txt>
            <Stepper value={work} onChange={(v) => actions.updateSettings({ workoutWorkSec: v })} step={5} min={10} max={120} format={(v) => `${v} s`} label="Belastung" />
          </Row>
        ) : null}
        <Row justify="space-between">
          <Txt>Pause</Txt>
          <Stepper value={rest} onChange={(v) => actions.updateSettings({ workoutRestSec: v })} step={5} min={0} max={120} format={(v) => `${v} s`} label="Pause" />
        </Row>
      </Card>

      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {plan.steps.map((s, i) => {
          const ex = getExercise(s.exerciseId);
          return (
            <View key={`${s.exerciseId}-${i}`}>
              {i > 0 ? <Divider /> : null}
              <Row gap={12} style={{ paddingVertical: 12 }} align="flex-start">
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt variant="caption" bold color={colors.primary}>
                    {i + 1}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt bold>{ex?.name ?? s.exerciseId}</Txt>
                  {ex?.tip ? <Txt variant="caption">{ex.tip}</Txt> : null}
                </View>
                <Row gap={4}>
                  <Icon name="timer-outline" size={16} color={colors.muted} />
                  <Txt variant="small">{s.sec ?? work} s</Txt>
                </Row>
              </Row>
            </View>
          );
        })}
      </Card>

      <Button title="Workout starten" icon="play" onPress={() => router.push({ pathname: '/workout/session', params: { id: plan.id } })} testID="plan-start" />
      <Txt variant="caption" center>
        Höre auf deinen Körper. Bei Schmerzen oder Schwindel bitte sofort pausieren.
      </Txt>
    </Screen>
  );
}

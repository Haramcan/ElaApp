import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Icon, Row, Screen, Txt } from '../../components/ui';
import { nextPlanDay } from '../../lib/gym';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function GymPlans() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const plans = state.gym.plans;

  return (
    <Screen edges={['bottom']}>
      <Button title="Plan erstellen lassen" icon="auto-fix" onPress={() => router.push('/gym/generator')} testID="plans-generate" />
      <Button
        title="Eigenen Plan anlegen"
        icon="pencil-plus"
        variant="secondary"
        testID="plans-create"
        onPress={() => {
          const id = actions.createPlan(`Mein Plan ${plans.length + 1}`);
          router.push({ pathname: '/gym/plan-edit', params: { id } });
        }}
      />
      <Button title="Plan importieren (von Freunden)" icon="download" variant="secondary" onPress={() => router.push('/gym/import')} testID="plans-import" />
      {plans.length === 0 ? (
        <EmptyState icon="clipboard-text-outline" title="Noch keine Pläne" text="Ein Trainingsplan legt fest, welche Geräte du an welchem Tag trainierst – mit Sätzen, Wiederholungen und Pausen." />
      ) : null}
      {plans.map((p) => {
        const active = p.id === state.gym.activePlanId;
        const next = nextPlanDay(state, p);
        const done = state.gym.sessions.filter((s) => s.planId === p.id).length;
        return (
          <Card key={p.id} onPress={() => router.push({ pathname: '/gym/plan-edit', params: { id: p.id } })} testID={`plan-card-${p.id}`} style={{ gap: 8, borderWidth: active ? 2 : 1, borderColor: active ? colors.primary : colors.border }}>
            <Row justify="space-between" align="flex-start">
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="h3">{p.name}</Txt>
                <Txt variant="caption">
                  {p.days.length} {p.days.length === 1 ? 'Tag' : 'Tage'} · {done} Trainings absolviert
                  {next ? ` · als Nächstes: ${next.name}` : ''}
                </Txt>
              </View>
              {active ? <Badge label="Aktiv" /> : null}
            </Row>
            {p.description ? <Txt variant="small">{p.description}</Txt> : null}
            <Row gap={6} wrap>
              {p.days.map((d) => (
                <Badge key={d.id} label={`${d.name} (${d.exercises.length})`} bg={colors.cardAlt} color={colors.textSecondary} />
              ))}
            </Row>
            {!active ? (
              <Pressable onPress={() => actions.setActivePlan(p.id)} accessibilityRole="button" hitSlop={6}>
                <Row gap={6}>
                  <Icon name="radiobox-blank" size={18} color={colors.primary} />
                  <Txt variant="small" bold color={colors.primary}>
                    Als aktiven Plan verwenden
                  </Txt>
                </Row>
              </Pressable>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

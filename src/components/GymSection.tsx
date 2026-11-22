import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { getGymExercise, nextPlanDay } from '../lib/gym';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { ActiveSessionBanner, useStartGym } from './gym';
import { Button, Card, Icon, Row, Txt } from './ui';

/** Gym entry point shown at the top of the training tab */
export function GymSection() {
  const { state } = useStore();
  const { colors } = useTheme();
  const start = useStartGym();
  const plan = state.gym.plans.find((p) => p.id === state.gym.activePlanId) ?? state.gym.plans[0];
  const next = plan ? nextPlanDay(state, plan) : undefined;

  return (
    <View style={{ gap: 10 }}>
      <ActiveSessionBanner />
      <Card style={{ gap: 10 }} testID="gym-section">
        <Row gap={12}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="weight-lifter" color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Krafttraining im Studio</Txt>
            <Txt variant="small">
              {plan && next
                ? `Als Nächstes: ${next.name} · ${next.exercises
                    .slice(0, 3)
                    .map((e) => getGymExercise(state, e.exerciseId)?.name)
                    .filter(Boolean)
                    .join(', ')}${next.exercises.length > 3 ? ' …' : ''}`
                : 'Geräte, Gewichte & Wiederholungen eintragen – und sehen, was du letztes Mal geschafft hast.'}
            </Txt>
          </View>
        </Row>
        {!state.gym.active ? (
          plan && next && next.exercises.length > 0 ? (
            <Button title={`${next.name} starten`} icon="play" onPress={() => void start({ plan, day: next })} testID="gym-section-start-plan" />
          ) : (
            <Button title="Training starten" icon="play" onPress={() => void start()} testID="gym-section-start" />
          )
        ) : null}
        <Row gap={8}>
          <Button small variant="soft" title="Übersicht" full={false} style={{ flex: 1 }} onPress={() => router.push('/gym')} testID="gym-section-open" />
          <Button small variant="soft" title="Pläne" full={false} style={{ flex: 1 }} onPress={() => router.push('/gym/plans')} />
          <Button small variant="soft" title="Geräte" full={false} style={{ flex: 1 }} onPress={() => router.push('/gym/exercises')} />
        </Row>
      </Card>
    </View>
  );
}

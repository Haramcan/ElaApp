import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { ActiveSessionBanner, LastTimeLine, useStartGym } from '../../components/gym';
import { Button, Card, Divider, EmptyState, Icon, ListItem, Row, Screen, SectionHeader, StatTile, Txt } from '../../components/ui';
import { displayWeight, formatNumber } from '../../lib/calc';
import { formatDayLabel, startOfWeek } from '../../lib/date';
import { getGymExercise, GYM_TIPS, nextPlanDay, sessionSetCount, sessionVolume } from '../../lib/gym';
import { useToday } from '../../lib/hooks';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function GymHome() {
  const { state } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const start = useStartGym();
  const wu = state.settings.weightUnit;
  const plan = state.gym.plans.find((p) => p.id === state.gym.activePlanId) ?? state.gym.plans[0];
  const next = plan ? nextPlanDay(state, plan) : undefined;
  const sessions = useMemo(() => [...state.gym.sessions].sort((a, b) => b.start - a.start), [state.gym.sessions]);
  const weekStart = startOfWeek(today, state.settings.weekStartsMonday);
  const thisWeek = sessions.filter((s) => s.date >= weekStart);
  const tip = GYM_TIPS[new Date().getDate() % GYM_TIPS.length];

  return (
    <Screen edges={['bottom']}>
      <ActiveSessionBanner />

      {plan && next ? (
        <Card style={{ gap: 10 }} testID="gym-next">
          <Row justify="space-between" align="flex-start">
            <View style={{ flex: 1 }}>
              <Txt variant="label">Nächstes Training</Txt>
              <Txt variant="h2">{next.name}</Txt>
              <Txt variant="caption">{plan.name}</Txt>
            </View>
            <Icon name="calendar-check" color={colors.primary} />
          </Row>
          {next.exercises.slice(0, 8).map((e) => (
            <View key={e.key} style={{ gap: 1 }}>
              <Txt variant="small" bold>
                {getGymExercise(state, e.exerciseId)?.name ?? 'Gelöschte Übung'} · {e.sets} × {e.repsMin}–{e.repsMax}
              </Txt>
              <LastTimeLine exerciseId={e.exerciseId} />
            </View>
          ))}
          {next.exercises.length === 0 ? <Txt variant="small">Dieser Tag hat noch keine Übungen.</Txt> : null}
          <Button title={`${next.name} starten`} icon="play" onPress={() => void start({ plan, day: next })} testID="gym-start-next" disabled={next.exercises.length === 0} />
          {plan.days.length > 1 ? (
            <Row gap={6} wrap>
              {plan.days
                .filter((d) => d.id !== next.id)
                .map((d) => (
                  <Button key={d.id} small variant="secondary" full={false} title={`${d.name} starten`} onPress={() => void start({ plan, day: d })} />
                ))}
            </Row>
          ) : null}
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <Row gap={10}>
            <Icon name="clipboard-text-outline" color={colors.primary} />
            <Txt variant="h3" style={{ flex: 1 }}>
              Noch kein Trainingsplan
            </Txt>
          </Row>
          <Txt variant="small">Lass dir in 30 Sekunden einen passenden Plan erstellen oder lege deinen eigenen an.</Txt>
          <Button title="Plan erstellen lassen" icon="auto-fix" onPress={() => router.push('/gym/generator')} testID="gym-generate" />
          <Button title="Eigenen Plan anlegen" icon="pencil" variant="secondary" onPress={() => router.push('/gym/plans')} />
        </Card>
      )}

      <Row gap={10}>
        <Button title="Freies Training" icon="play-circle-outline" variant="soft" full={false} style={{ flex: 1 }} onPress={() => void start()} testID="gym-start-free" />
        <Button title="Pläne" icon="clipboard-list-outline" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => router.push('/gym/plans')} testID="gym-plans" />
      </Row>
      <Button title="Geräte & Übungen · Verlauf" icon="weight-lifter" variant="secondary" onPress={() => router.push('/gym/exercises')} testID="gym-library" />

      <Row gap={10}>
        <StatTile label="Diese Woche" value={String(thisWeek.length)} unit="Trainings" icon="calendar-week" />
        <StatTile label="Gesamt" value={String(sessions.length)} unit="Trainings" icon="dumbbell" />
      </Row>

      <SectionHeader title="Letzte Trainings" />
      {sessions.length === 0 ? (
        <EmptyState icon="weight-lifter" title="Noch kein Krafttraining" text="Starte ein Training und trage für jedes Gerät Gewicht und Wiederholungen ein. Beim nächsten Mal siehst du, was du zuletzt geschafft hast." />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          {sessions.slice(0, 10).map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 ? <Divider /> : null}
              <ListItem
                icon="weight-lifter"
                iconColor={colors.primary}
                title={s.name}
                subtitle={`${formatDayLabel(s.date, today)} · ${s.exercises.length} Übungen · ${sessionSetCount(s)} Sätze · ${formatNumber(displayWeight(sessionVolume(s), wu))} ${wu}`}
                chevron
                onPress={() => router.push({ pathname: '/gym/session-detail', params: { id: s.id } })}
              />
            </React.Fragment>
          ))}
        </Card>
      )}

      <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Icon name="lightbulb-on-outline" color={colors.warning} />
        <Txt variant="small" style={{ flex: 1 }}>
          {tip}
        </Txt>
      </Card>
    </Screen>
  );
}

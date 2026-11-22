import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useStartGym } from '../../components/gym';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Row, Screen, StatTile, Txt } from '../../components/ui';
import { displayWeight, formatNumber } from '../../lib/calc';
import { formatDayLabel } from '../../lib/date';
import { completedSets, estimate1RM, getGymExercise, personalRecords, sessionLogsFromSession, sessionSetCount, sessionVolume } from '../../lib/gym';
import { useToday } from '../../lib/hooks';
import { confirm } from '../../lib/platform';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function GymSessionDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const today = useToday();
  const start = useStartGym();
  const s = state.gym.sessions.find((x) => x.id === id);
  if (!s) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="weight-lifter" title="Training nicht gefunden" text="Es wurde vielleicht gelöscht.">
          <Button title="Zur Übersicht" full={false} onPress={() => router.replace('/gym')} />
        </EmptyState>
      </Screen>
    );
  }
  const wu = state.settings.weightUnit;
  const fmt = (kg: number) => `${formatNumber(displayWeight(kg, wu), 1)} ${wu}`;
  const minutes = s.end ? Math.round((s.end - s.start) / 60000) : 0;
  const prs = new Set(personalRecords(state, s).map((p) => p.exerciseId));

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 4 }}>
        <Txt variant="h2">{s.name}</Txt>
        <Txt variant="small">
          {formatDayLabel(s.date, today)} · {new Date(s.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
        </Txt>
      </Card>
      <Row gap={10}>
        <StatTile label="Dauer" value={String(minutes)} unit="min" icon="clock-outline" />
        <StatTile label="Sätze" value={String(sessionSetCount(s))} icon="format-list-numbered" />
        <StatTile label="Volumen" value={formatNumber(displayWeight(sessionVolume(s), wu))} unit={wu} icon="weight" />
      </Row>
      {prs.size > 0 ? (
        <Card style={{ backgroundColor: colors.warningSoft, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Txt variant="h2">🏆</Txt>
          <Txt variant="small" style={{ flex: 1 }}>
            {prs.size === 1 ? 'Ein neuer Gewichtsrekord' : `${prs.size} neue Gewichtsrekorde`} in diesem Training!
          </Txt>
        </Card>
      ) : null}

      {s.exercises.map((log) => {
        const sets = completedSets(log);
        return (
          <Card key={log.key} style={{ gap: 8 }} onPress={() => router.push({ pathname: '/gym/exercise', params: { id: log.exerciseId } })}>
            <Row justify="space-between">
              <Txt variant="h3" style={{ flex: 1 }}>
                {getGymExercise(state, log.exerciseId)?.name ?? 'Gelöschte Übung'}
              </Txt>
              {prs.has(log.exerciseId) ? <Badge label="Rekord" color={colors.warning} bg={colors.warningSoft} /> : null}
            </Row>
            {sets.map((st, i) => (
              <Row key={i} justify="space-between">
                <Txt variant="small">Satz {i + 1}</Txt>
                <Txt variant="small" bold>
                  {(st.weightKg ?? 0) > 0 ? fmt(st.weightKg ?? 0) : 'Körpergewicht'} × {st.reps}
                </Txt>
                <Txt variant="caption" style={{ width: 90, textAlign: 'right' }}>
                  {(st.weightKg ?? 0) > 0 ? `1RM ≈ ${formatNumber(displayWeight(estimate1RM(st.weightKg ?? 0, st.reps ?? 0), wu), 1)}` : ''}
                </Txt>
              </Row>
            ))}
          </Card>
        );
      })}

      <Button title="Dieses Training wiederholen" icon="repeat" onPress={() => void start({ name: s.name, exercises: sessionLogsFromSession(state, s) })} testID="gym-repeat" />
      <Button
        title="Training löschen"
        icon="delete"
        variant="danger"
        onPress={async () => {
          if (await confirm('Training löschen?', 'Das Training und der zugehörige Aktivitätseintrag werden gelöscht.', 'Löschen', true)) {
            actions.deleteGymSession(s.id);
            toast('Training gelöscht');
            router.back();
          }
        }}
      />
      <View style={{ height: 8 }} />
    </Screen>
  );
}

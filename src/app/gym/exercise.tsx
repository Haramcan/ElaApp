import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { LineChart } from '../../components/charts';
import { useToast } from '../../components/Toast';
import { Button, Card, Divider, EmptyState, Input, ListItem, Row, Screen, SectionHeader, StatTile, Txt } from '../../components/ui';
import { displayWeight, formatNumber } from '../../lib/calc';
import { formatShortDate } from '../../lib/date';
import {
  best1RM,
  bestWeight,
  completedSets,
  EQUIPMENT_LABELS,
  exerciseHistory,
  formatSets,
  getGymExercise,
  MUSCLE_LABELS,
  newSessionLog,
  topSet,
} from '../../lib/gym';
import { confirm } from '../../lib/platform';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function GymExerciseDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const wu = state.settings.weightUnit;
  const ex = id ? getGymExercise(state, id) : undefined;
  const history = useMemo(() => (id ? exerciseHistory(state, id) : []), [state, id]);

  if (!ex || !id) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="help-circle-outline" title="Übung nicht gefunden" />
      </Screen>
    );
  }

  const fmt = (kg: number) => `${formatNumber(displayWeight(kg, wu), 1)} ${wu}`;
  const chartData = [...history]
    .reverse()
    .slice(-30)
    .map((h) => ({ label: formatShortDate(h.session.date), value: displayWeight(topSet(h.log)?.weightKg ?? 0, wu) }));
  const best = bestWeight(state, id);
  const orm = best1RM(state, id);
  const lastTop = history[0] ? topSet(history[0].log) : undefined;
  const firstTop = history.length > 0 ? topSet(history[history.length - 1].log) : undefined;
  const progress = lastTop && firstTop ? (lastTop.weightKg ?? 0) - (firstTop.weightKg ?? 0) : 0;
  const inActive = state.gym.active?.exercises.some((l) => l.exerciseId === id);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: ex.name }} />
      <Card style={{ gap: 6 }}>
        <Txt variant="h2">{ex.name}</Txt>
        <Txt variant="small">
          {MUSCLE_LABELS[ex.muscle]} · {EQUIPMENT_LABELS[ex.equipment]}
          {ex.custom ? ' · eigenes Gerät' : ''}
        </Txt>
        {ex.tip ? <Txt variant="small">💡 {ex.tip}</Txt> : null}
      </Card>

      <Card>
        <Input
          label="Geräte-Einstellung"
          value={state.gym.notes[id] ?? ''}
          onChangeText={(t) => actions.setGymNote(id, t)}
          placeholder="z. B. Sitz 4, Rückenlehne 2, Griff mittig"
          maxLength={80}
          hint="Wird beim Training angezeigt."
        />
      </Card>

      <Row gap={10}>
        <StatTile label="Bestes Gewicht" value={best > 0 ? formatNumber(displayWeight(best, wu), 1) : '–'} unit={best > 0 ? wu : undefined} icon="trophy-outline" color={colors.warning} />
        <StatTile label="Geschätztes 1RM" value={orm > 0 ? formatNumber(displayWeight(orm, wu), 1) : '–'} unit={orm > 0 ? wu : undefined} icon="arm-flex" />
      </Row>
      <Row gap={10}>
        <StatTile label="Einheiten" value={String(history.length)} icon="calendar-check" />
        <StatTile label="Fortschritt" value={history.length > 1 ? `${progress >= 0 ? '+' : ''}${formatNumber(displayWeight(progress, wu), 1)}` : '–'} unit={history.length > 1 ? wu : undefined} icon="trending-up" color={colors.success} />
      </Row>

      {state.gym.active && !inActive ? (
        <Button
          title="Zum laufenden Training hinzufügen"
          icon="plus"
          variant="soft"
          onPress={() => {
            actions.addActiveLog(newSessionLog(state, id, { restSec: state.settings.gymRestSec }));
            toast({ message: `${ex.name} hinzugefügt`, icon: 'check' });
            router.push('/gym/session');
          }}
        />
      ) : null}

      <SectionHeader title="Gewichtsverlauf" />
      <Card>
        {chartData.length >= 2 ? (
          <LineChart data={chartData} unit={wu} testID="gym-ex-chart" />
        ) : (
          <Txt variant="small" center style={{ paddingVertical: 16 }}>
            Nach zwei Trainings siehst du hier deinen Verlauf.
          </Txt>
        )}
      </Card>

      <SectionHeader title="Verlauf" />
      {history.length === 0 ? (
        <Txt variant="small">Noch keine Einträge für diese Übung.</Txt>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          {history.slice(0, 50).map((h, i) => (
            <View key={`${h.session.id}-${h.log.key}`}>
              {i > 0 ? <Divider /> : null}
              <ListItem
                title={new Date(h.session.start).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                subtitle={`${formatSets(h.log, fmt)} · ${completedSets(h.log).length} Sätze`}
                chevron
                onPress={() => router.push({ pathname: '/gym/session-detail', params: { id: h.session.id } })}
              />
            </View>
          ))}
        </Card>
      )}

      {ex.custom ? (
        <Button
          title="Eigenes Gerät löschen"
          icon="delete"
          variant="danger"
          onPress={async () => {
            if (await confirm('Gerät löschen?', `„${ex.name}“ wird aus der Liste entfernt. Bisherige Trainings bleiben erhalten.`, 'Löschen', true)) {
              actions.deleteGymExercise(ex.id);
              router.back();
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

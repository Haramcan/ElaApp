import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useToast } from '../../components/Toast';
import { Badge, Button, Card, Divider, EmptyState, Icon, IconButton, ListItem, ProgressBar, Row, Screen, SectionHeader, StatTile, Txt } from '../../components/ui';
import { energyValue, formatNumber } from '../../lib/calc';
import { formatDayLabel, startOfWeek } from '../../lib/date';
import { getExercise, planDurationSec, WORKOUT_PLANS } from '../../lib/exercises';
import { useToday } from '../../lib/hooks';
import { challengeProgress, workoutsThisWeek } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function Training() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const toast = useToast();
  const unit = state.settings.energyUnit;
  const weekStart = startOfWeek(today, state.settings.weekStartsMonday);
  const week = useMemo(() => state.workouts.filter((w) => w.date >= weekStart && w.date <= today), [state.workouts, weekStart, today]);
  const kcalWeek = week.reduce((s, w) => s + w.kcal, 0);
  const minWeek = week.reduce((s, w) => s + w.durationMin, 0);
  const sessions = workoutsThisWeek(state, today);
  const cp = challengeProgress(state, today);
  const recent = useMemo(
    () => [...state.workouts].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 25),
    [state.workouts],
  );

  return (
    <Screen>
      <Txt variant="title">Training</Txt>

      <Card style={{ gap: 10 }}>
        <Row justify="space-between">
          <Txt variant="h3">Diese Woche</Txt>
          <Txt variant="small">
            {sessions}/{state.goals.workoutsPerWeek} Trainingstage
          </Txt>
        </Row>
        <ProgressBar value={sessions} max={state.goals.workoutsPerWeek} height={10} />
        {sessions >= state.goals.workoutsPerWeek ? (
          <Txt variant="small" color={colors.success}>
            Wochenziel erreicht – stark! 🎉
          </Txt>
        ) : null}
      </Card>
      <Row gap={10}>
        <StatTile label="Verbrannt" value={formatNumber(energyValue(kcalWeek, unit))} unit={unit} icon="fire" color={colors.fire} />
        <StatTile label="Aktive Zeit" value={formatNumber(minWeek)} unit="min" icon="clock-outline" />
        <StatTile label="Einheiten" value={String(week.length)} icon="dumbbell" />
      </Row>

      <Button title="Aktivität eintragen" icon="plus" onPress={() => router.push('/workout/log')} testID="log-workout" />

      <Card onPress={() => router.push('/challenge')} testID="training-challenges">
        <Row gap={12}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arm-flex" color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Tages-Challenges</Txt>
            <Txt variant="small">
              {cp.total === 0 ? 'Keine aktiv' : `${cp.completed} von ${cp.total} erledigt`} · Zähler & Timer
            </Txt>
          </View>
          <Icon name="chevron-right" color={colors.muted} />
        </Row>
      </Card>

      <SectionHeader title="Geführte Workouts" />
      {WORKOUT_PLANS.map((p) => {
        const sec = planDurationSec(p, state.settings.workoutWorkSec, state.settings.workoutRestSec);
        return (
          <Card key={p.id} onPress={() => router.push({ pathname: '/workout/plan', params: { id: p.id } })} testID={`plan-${p.id}`}>
            <Row gap={12}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={p.icon} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="h3">{p.name}</Txt>
                <Txt variant="small" numberOfLines={2}>
                  {p.description}
                </Txt>
                <Row gap={6} style={{ marginTop: 4 }}>
                  <Badge label={p.level} />
                  <Badge label={`ca. ${Math.round(sec / 60)} min`} bg={colors.cardAlt} color={colors.textSecondary} />
                  <Badge label={`${p.steps.length} Übungen × ${p.rounds}`} bg={colors.cardAlt} color={colors.textSecondary} />
                </Row>
              </View>
            </Row>
          </Card>
        );
      })}

      <SectionHeader title="Verlauf" />
      {recent.length === 0 ? (
        <EmptyState icon="run" title="Noch keine Aktivitäten" text="Trage dein erstes Training ein oder starte ein geführtes Workout." />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          {recent.map((w, i) => (
            <React.Fragment key={w.id}>
              {i > 0 ? <Divider /> : null}
              <ListItem
                icon={getExercise(w.exerciseId)?.icon ?? 'dumbbell'}
                iconColor={colors.primary}
                title={w.name}
                subtitle={[
                  formatDayLabel(w.date, today),
                  w.reps ? `${w.reps} Wdh.` : null,
                  `${formatNumber(w.durationMin)} min`,
                  w.distanceKm ? `${formatNumber(w.distanceKm, 1)} km` : null,
                  `${formatNumber(energyValue(w.kcal, unit))} ${unit}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    color={colors.muted}
                    label={`${w.name} löschen`}
                    onPress={() => {
                      actions.removeWorkout(w.id);
                      toast({
                        message: 'Aktivität gelöscht',
                        icon: 'delete',
                        actionLabel: 'Rückgängig',
                        onAction: () => actions.addWorkout({ ...w }),
                      });
                    }}
                  />
                }
              />
            </React.Fragment>
          ))}
        </Card>
      )}
    </Screen>
  );
}

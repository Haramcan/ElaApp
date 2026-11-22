import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Divider, Row, Screen, Segmented, Txt } from '../../components/ui';
import { generatePlan, getGymExercise, GOAL_LABELS, makeKey, type PlanEquipment, type PlanGoal, type PlanLevel } from '../../lib/gym';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

const GOAL_DESC: Record<PlanGoal, string> = {
  muskelaufbau: '8–12 Wdh., mittlere Gewichte – ideal für sichtbare Muskeln.',
  kraft: '4–6 Wdh., schwere Gewichte, längere Pausen.',
  abnehmen: '12–15 Wdh., kurze Pausen – hoher Kalorienverbrauch.',
  fitness: '10–12 Wdh. – ausgewogen für Gesundheit und Alltag.',
};

export default function PlanGenerator() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const [goal, setGoal] = useState<PlanGoal>(state.profile.goal === 'lose' ? 'abnehmen' : 'muskelaufbau');
  const [days, setDays] = useState(Math.min(5, Math.max(2, state.goals.workoutsPerWeek)));
  const [level, setLevel] = useState<PlanLevel>(state.gym.sessions.length > 20 ? 'fortgeschritten' : 'anfaenger');
  const [equipment, setEquipment] = useState<PlanEquipment>('maschinen');
  const [focus, setFocus] = useState<'ausgewogen' | 'oberkoerper' | 'beine_po'>('ausgewogen');

  const plan = useMemo(() => generatePlan({ goal, daysPerWeek: days, level, equipment, focus }, makeKey), [goal, days, level, equipment, focus]);

  return (
    <Screen edges={['bottom']}>
      <Txt variant="small">Beantworte ein paar Fragen – wir stellen dir einen passenden Plan mit Geräten aus dem Fitnessstudio zusammen. Du kannst ihn danach beliebig anpassen.</Txt>

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">Dein Ziel</Txt>
        <Row gap={6} wrap>
          {(Object.keys(GOAL_LABELS) as PlanGoal[]).map((g) => (
            <Chip key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} testID={`gen-goal-${g}`} />
          ))}
        </Row>
        <Txt variant="caption">{GOAL_DESC[goal]}</Txt>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">Trainingstage pro Woche</Txt>
        <Row gap={6} wrap>
          {[2, 3, 4, 5, 6].map((d) => (
            <Chip key={d} label={`${d}×`} selected={days === d} onPress={() => setDays(d)} testID={`gen-days-${d}`} />
          ))}
        </Row>
        <Txt variant="h3">Erfahrung</Txt>
        <Segmented
          testIDPrefix="gen-level"
          options={[
            { value: 'anfaenger', label: 'Anfänger' },
            { value: 'fortgeschritten', label: 'Fortgeschritten' },
          ]}
          value={level}
          onChange={setLevel}
        />
        <Txt variant="h3">Bevorzugt</Txt>
        <Segmented
          testIDPrefix="gen-eq"
          options={[
            { value: 'maschinen', label: 'Geräte' },
            { value: 'gemischt', label: 'Gemischt' },
            { value: 'freihantel', label: 'Freihantel' },
          ]}
          value={equipment}
          onChange={setEquipment}
        />
        <Txt variant="h3">Schwerpunkt</Txt>
        <Segmented
          options={[
            { value: 'ausgewogen', label: 'Ausgewogen' },
            { value: 'oberkoerper', label: 'Oberkörper' },
            { value: 'beine_po', label: 'Beine & Po' },
          ]}
          value={focus}
          onChange={setFocus}
        />
      </Card>

      <Txt variant="h2">Vorschau</Txt>
      <Card style={{ gap: 6 }}>
        <Txt variant="h3">{plan.name}</Txt>
        <Txt variant="small">{plan.description}</Txt>
      </Card>
      {plan.days.map((d) => (
        <Card key={d.id} style={{ gap: 6 }} testID="gen-day">
          <Txt variant="h3" color={colors.primary}>
            {d.name}
          </Txt>
          {d.exercises.map((e, i) => (
            <View key={e.key}>
              {i > 0 ? <Divider /> : null}
              <Row justify="space-between" style={{ paddingVertical: 6 }}>
                <Txt variant="small" style={{ flex: 1 }}>
                  {getGymExercise(state, e.exerciseId)?.name}
                </Txt>
                <Txt variant="small" bold>
                  {e.sets} × {e.repsMin}–{e.repsMax}
                </Txt>
              </Row>
            </View>
          ))}
        </Card>
      ))}

      <Button
        title="Plan übernehmen"
        icon="check"
        testID="gen-save"
        onPress={() => {
          actions.savePlan(plan, true);
          toast({ message: 'Trainingsplan gespeichert und aktiviert', icon: 'check' });
          router.replace({ pathname: '/gym/plan-edit', params: { id: plan.id } });
        }}
      />
      <Txt variant="caption" center>
        Tipp: Kennst du ein Gerät nicht oder ist es belegt? Tausche es im Plan einfach gegen ein anderes aus.
      </Txt>
    </Screen>
  );
}

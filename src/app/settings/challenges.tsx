import { router } from 'expo-router';
import React, { useState } from 'react';
import { Switch, View } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Divider, Icon, IconButton, Row, Screen, Segmented, Stepper, Txt } from '../../components/ui';
import { EXERCISES, getExercise } from '../../lib/exercises';
import { confirm } from '../../lib/platform';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

const CANDIDATES = EXERCISES.filter((e) => e.kind === 'reps' || ['plank', 'wall_sit', 'side_plank', 'high_knees', 'rope', 'stretching'].includes(e.id));

export default function ManageChallenges() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [exId, setExId] = useState('pushups');
  const [unit, setUnit] = useState<'reps' | 'sec'>('reps');
  const [target, setTarget] = useState(10);

  return (
    <Screen edges={['bottom']}>
      <Txt variant="small">
        Kleine tägliche Aufgaben, die sich schnell erledigen lassen – z. B. 10 Liegestütze. Aktive Challenges erscheinen auf der Startseite und in den
        Erinnerungen.
      </Txt>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {state.challenges.map((c, i) => {
          const ex = getExercise(c.exerciseId);
          return (
            <View key={c.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: 12, gap: 10 }}>
                <Row gap={12}>
                  <Icon name={ex?.icon ?? 'arm-flex'} color={c.enabled ? colors.primary : colors.muted} />
                  <Txt bold style={{ flex: 1 }}>
                    {c.name}
                  </Txt>
                  <Switch
                    value={c.enabled}
                    onValueChange={(v) => actions.updateChallenge(c.id, { enabled: v })}
                    trackColor={{ false: colors.track, true: colors.primary }}
                    thumbColor="#fff"
                    accessibilityLabel={`${c.name} aktiv`}
                    testID={`ch-switch-${c.exerciseId}`}
                  />
                </Row>
                <Row justify="space-between">
                  <Txt variant="small">Tagesziel</Txt>
                  <Row gap={4}>
                    <Stepper
                      value={c.target}
                      onChange={(v) => actions.updateChallenge(c.id, { target: v })}
                      step={c.unit === 'sec' ? 5 : 1}
                      min={1}
                      max={c.unit === 'sec' ? 600 : 500}
                      format={(v) => (c.unit === 'sec' ? `${v} s` : `${v}×`)}
                      label={c.name}
                      testID={`ch-target-${c.exerciseId}`}
                    />
                    <IconButton
                      icon="delete-outline"
                      size={18}
                      color={colors.muted}
                      label={`${c.name} löschen`}
                      onPress={async () => {
                        if (await confirm('Challenge löschen?', `„${c.name}“ wird entfernt. Der bisherige Fortschritt bleibt in der Statistik.`, 'Löschen', true)) {
                          actions.removeChallenge(c.id);
                        }
                      }}
                    />
                  </Row>
                </Row>
              </View>
            </View>
          );
        })}
      </Card>

      {adding ? (
        <Card style={{ gap: 12 }}>
          <Txt variant="h3">Neue Challenge</Txt>
          <Row gap={6} wrap>
            {CANDIDATES.map((e) => (
              <Chip
                key={e.id}
                label={e.name}
                selected={exId === e.id}
                onPress={() => {
                  setExId(e.id);
                  setUnit(e.kind === 'reps' ? 'reps' : 'sec');
                  setTarget(e.kind === 'reps' ? 10 : 30);
                }}
              />
            ))}
          </Row>
          <Segmented
            options={[
              { value: 'reps', label: 'Wiederholungen' },
              { value: 'sec', label: 'Sekunden' },
            ]}
            value={unit}
            onChange={setUnit}
          />
          <Row justify="space-between">
            <Txt>Tagesziel</Txt>
            <Stepper value={target} onChange={setTarget} step={unit === 'sec' ? 5 : 1} min={1} max={unit === 'sec' ? 600 : 500} format={(v) => (unit === 'sec' ? `${v} s` : `${v}×`)} label="Ziel" />
          </Row>
          <Row gap={10}>
            <Button title="Abbrechen" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => setAdding(false)} />
            <Button
              title="Hinzufügen"
              full={false}
              style={{ flex: 1 }}
              testID="ch-add-save"
              onPress={() => {
                const ex = getExercise(exId);
                actions.addChallenge({ exerciseId: exId, name: ex?.name ?? exId, target, unit, enabled: true });
                setAdding(false);
                toast({ message: 'Challenge hinzugefügt', icon: 'check' });
              }}
            />
          </Row>
        </Card>
      ) : (
        <Button title="Challenge hinzufügen" icon="plus" variant="soft" onPress={() => setAdding(true)} testID="ch-add" />
      )}
      <Button title="Erinnerung für Challenges einstellen" icon="bell-outline" variant="ghost" onPress={() => router.push({ pathname: '/settings/reminder-edit', params: { id: 'rem_challenge' } })} />
    </Screen>
  );
}

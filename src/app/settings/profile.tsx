import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Input, NumberInput, Row, Screen, Segmented, Txt } from '../../components/ui';
import { ACTIVITY_LABELS, displayWeight, formatNumber, toKg } from '../../lib/calc';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { ActivityLevel, GoalType, Sex } from '../../lib/types';

export default function ProfileSettings() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const p = state.profile;
  const wu = state.settings.weightUnit;
  const year = new Date().getFullYear();
  const [name, setName] = useState(p.name);
  const [sex, setSex] = useState<Sex>(p.sex);
  const [birthYear, setBirthYear] = useState<number | null>(p.birthYear);
  const [height, setHeight] = useState<number | null>(p.heightCm);
  const [target, setTarget] = useState<number | null>(displayWeight(p.targetWeightKg, wu));
  const [activity, setActivity] = useState<ActivityLevel>(p.activity);
  const [goal, setGoal] = useState<GoalType>(p.goal);
  const [rate, setRate] = useState(p.weeklyRateKg || 0.5);

  const valid =
    name.trim().length > 0 &&
    birthYear != null &&
    birthYear >= year - 100 &&
    birthYear <= year - 13 &&
    height != null &&
    height >= 120 &&
    height <= 230 &&
    target != null &&
    toKg(target, wu) >= 30 &&
    toKg(target, wu) <= 300;

  const save = () => {
    if (!valid || birthYear == null || height == null || target == null) return;
    actions.updateProfile({
      name: name.trim(),
      sex,
      birthYear,
      heightCm: height,
      targetWeightKg: Math.round(toKg(target, wu) * 10) / 10,
      activity,
      goal,
      weeklyRateKg: goal === 'maintain' ? 0 : rate,
    });
    toast({ message: 'Profil gespeichert', icon: 'check' });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card style={{ gap: 12 }}>
          <Input label="Name" value={name} onChangeText={setName} maxLength={30} testID="profile-name" />
          <Segmented
            options={[
              { value: 'female', label: 'Weiblich' },
              { value: 'male', label: 'Männlich' },
            ]}
            value={sex}
            onChange={setSex}
          />
          <Row gap={10}>
            <NumberInput style={{ flex: 1 }} label="Geburtsjahr" value={birthYear} onChange={setBirthYear} decimals={0} min={year - 100} max={year - 13} />
            <NumberInput style={{ flex: 1 }} label="Größe" suffix="cm" value={height} onChange={setHeight} decimals={0} min={120} max={230} />
          </Row>
          <Txt variant="caption">Dein aktuelles Gewicht trägst du unter „Gewicht & Maße“ ein.</Txt>
        </Card>

        <Card style={{ gap: 10 }}>
          <Txt variant="h3">Aktivitätslevel</Txt>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
            <Chip key={a} label={`${ACTIVITY_LABELS[a].title} – ${ACTIVITY_LABELS[a].desc}`} selected={activity === a} onPress={() => setActivity(a)} />
          ))}
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h3">Ziel</Txt>
          <Segmented
            options={[
              { value: 'lose', label: 'Abnehmen' },
              { value: 'maintain', label: 'Halten' },
              { value: 'gain', label: 'Zunehmen' },
            ]}
            value={goal}
            onChange={setGoal}
          />
          <NumberInput label="Wunschgewicht" suffix={wu} value={target} onChange={setTarget} />
          {goal !== 'maintain' ? (
            <>
              <Txt variant="small" bold>
                Tempo pro Woche
              </Txt>
              <Row gap={6} wrap>
                {[0.25, 0.5, 0.75, 1].map((r) => (
                  <Chip key={r} label={`${formatNumber(r, 2)} kg`} selected={rate === r} onPress={() => setRate(r)} />
                ))}
              </Row>
            </>
          ) : null}
          {!state.goals.autoCalories ? (
            <Txt variant="caption" color={colors.warning}>
              Dein Kalorienziel ist manuell festgelegt und wird nicht automatisch angepasst. Ändern unter „Ziele“.
            </Txt>
          ) : (
            <Txt variant="caption">Dein Kalorienziel wird automatisch neu berechnet.</Txt>
          )}
        </Card>

        <Button title="Speichern" icon="content-save" onPress={save} disabled={!valid} testID="profile-save" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

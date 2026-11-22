import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Chip, Icon, Input, NumberInput, Row, Screen, Segmented, Txt } from '../components/ui';
import {
  ACTIVITY_LABELS,
  bmi,
  bmiCategory,
  bmr,
  calorieGoal,
  formatNumber,
  healthyWeightRange,
  macroGrams,
  tdee,
  weeksToTarget,
} from '../lib/calc';
import { DEFAULT_PROFILE, goalsFromProfile } from '../lib/defaults';
import { notificationsSupported, requestPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import type { ActivityLevel, GoalType, Profile, Sex } from '../lib/types';

const STEPS = 6;

export default function Onboarding() {
  const { actions } = useStore();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('female');
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [goal, setGoal] = useState<GoalType>('lose');
  const [target, setTarget] = useState<number | null>(null);
  const [rate, setRate] = useState(0.5);
  const [remindersOn, setRemindersOn] = useState(true);
  const [busy, setBusy] = useState(false);

  const year = new Date().getFullYear();

  const profile: Profile = useMemo(
    () => ({
      ...DEFAULT_PROFILE,
      name: name.trim(),
      sex,
      birthYear: birthYear ?? year - 30,
      heightCm: height ?? 170,
      startWeightKg: weight ?? 70,
      targetWeightKg: goal === 'maintain' ? (weight ?? 70) : (target ?? weight ?? 70),
      activity,
      goal,
      weeklyRateKg: goal === 'maintain' ? 0 : rate,
    }),
    [name, sex, birthYear, height, weight, target, activity, goal, rate, year],
  );

  const validBody =
    birthYear != null &&
    birthYear >= year - 100 &&
    birthYear <= year - 13 &&
    height != null &&
    height >= 120 &&
    height <= 230 &&
    weight != null &&
    weight >= 30 &&
    weight <= 300;

  const validGoal =
    goal === 'maintain' ||
    (target != null &&
      target >= 30 &&
      target <= 300 &&
      (goal === 'lose' ? target < (weight ?? 0) : target > (weight ?? 0)));

  const canNext = [true, name.trim().length > 0, validBody, true, validGoal, true][step];

  const finish = async () => {
    setBusy(true);
    const goals = goalsFromProfile(profile, profile.startWeightKg);
    actions.completeOnboarding(profile, goals);
    if (!remindersOn) actions.setAllReminders(false);
    else if (notificationsSupported) await requestPermission();
    setBusy(false);
    router.replace('/');
  };

  const next = () => {
    if (step < STEPS - 1) setStep(step + 1);
    else void finish();
  };

  const goalError = (() => {
    if (goal === 'maintain' || target == null || weight == null) return undefined;
    if (goal === 'lose' && target >= weight) return 'Zum Abnehmen muss das Ziel unter deinem Gewicht liegen.';
    if (goal === 'gain' && target <= weight) return 'Zum Zunehmen muss das Ziel über deinem Gewicht liegen.';
    return undefined;
  })();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <Row gap={6} style={{ marginBottom: 8 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.track }} />
          ))}
        </Row>

        {step === 0 && (
          <View style={{ gap: 16, paddingTop: 24 }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="heart-pulse" size={46} color={colors.primary} />
            </View>
            <Txt variant="title">Willkommen bei FitLife</Txt>
            <Txt color={colors.textSecondary}>
              Dein persönlicher Begleiter für Ernährung, Training und gesunde Gewohnheiten. In weniger als einer Minute
              richten wir alles für dich ein.
            </Txt>
            {[
              ['barcode-scan', 'Kalorien zählen per Barcode-Scan'],
              ['bell-ring', 'Erinnerungen für Wasser, Mahlzeiten & Challenges'],
              ['arm-flex', 'Tages-Challenges wie 10 Liegestütze'],
              ['timer-outline', 'Geführte Workouts & Intervallfasten'],
              ['chart-line', 'Fortschritt, Gewicht & Erfolge'],
            ].map(([icon, text]) => (
              <Row key={text} gap={12}>
                <Icon name={icon} color={colors.primary} />
                <Txt style={{ flex: 1 }}>{text}</Txt>
              </Row>
            ))}
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 18 }}>
            <Txt variant="h1">Wie heißt du?</Txt>
            <Input
              testID="ob-name"
              label="Vorname"
              placeholder="z. B. Ela"
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={30}
            />
            <Txt variant="h3">Geschlecht</Txt>
            <Txt variant="small">Wird für die Berechnung deines Grundumsatzes benötigt.</Txt>
            <Segmented
              testIDPrefix="ob-sex"
              options={[
                { value: 'female', label: 'Weiblich' },
                { value: 'male', label: 'Männlich' },
              ]}
              value={sex}
              onChange={setSex}
            />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 16 }}>
            <Txt variant="h1">Deine Körperdaten</Txt>
            <NumberInput testID="ob-birthyear" label="Geburtsjahr" value={birthYear} onChange={setBirthYear} decimals={0} min={year - 100} max={year - 13} placeholder={String(year - 30)} />
            <NumberInput testID="ob-height" label="Größe" suffix="cm" value={height} onChange={setHeight} decimals={0} min={120} max={230} placeholder="170" />
            <NumberInput testID="ob-weight" label="Aktuelles Gewicht" suffix="kg" value={weight} onChange={setWeight} decimals={1} min={30} max={300} placeholder="70" />
            {validBody && height && weight ? (
              <Card>
                <Txt variant="small">
                  BMI: <Txt variant="small" bold>{formatNumber(bmi(weight, height), 1)}</Txt> ({bmiCategory(bmi(weight, height))}) · Gesunder Bereich:{' '}
                  {formatNumber(healthyWeightRange(height)[0], 0)}–{formatNumber(healthyWeightRange(height)[1], 0)} kg
                </Txt>
              </Card>
            ) : null}
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 12 }}>
            <Txt variant="h1">Wie aktiv bist du?</Txt>
            <Txt variant="small">Ohne gezieltes Training – das kannst du später separat eintragen.</Txt>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <Card
                key={a}
                testID={`ob-activity-${a}`}
                onPress={() => setActivity(a)}
                style={{ borderWidth: 2, borderColor: activity === a ? colors.primary : colors.border }}
              >
                <Row justify="space-between">
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3">{ACTIVITY_LABELS[a].title}</Txt>
                    <Txt variant="small">{ACTIVITY_LABELS[a].desc}</Txt>
                  </View>
                  {activity === a ? <Icon name="check-circle" color={colors.primary} /> : null}
                </Row>
              </Card>
            ))}
          </View>
        )}

        {step === 4 && (
          <View style={{ gap: 16 }}>
            <Txt variant="h1">Was ist dein Ziel?</Txt>
            <Segmented
              testIDPrefix="ob-goal"
              options={[
                { value: 'lose', label: 'Abnehmen' },
                { value: 'maintain', label: 'Halten' },
                { value: 'gain', label: 'Zunehmen' },
              ]}
              value={goal}
              onChange={(g) => setGoal(g)}
            />
            {goal !== 'maintain' ? (
              <>
                <NumberInput
                  testID="ob-target"
                  label="Wunschgewicht"
                  suffix="kg"
                  value={target}
                  onChange={setTarget}
                  min={30}
                  max={300}
                  placeholder={weight ? formatNumber(goal === 'lose' ? weight - 5 : weight + 5, 0) : ''}
                />
                {goalError ? (
                  <Txt variant="caption" color={colors.danger}>
                    {goalError}
                  </Txt>
                ) : null}
                <Txt variant="h3">Tempo pro Woche</Txt>
                <Row wrap gap={8}>
                  {[0.25, 0.5, 0.75, 1].map((r) => (
                    <Chip key={r} testID={`ob-rate-${r}`} label={`${formatNumber(r, 2)} kg`} selected={rate === r} onPress={() => setRate(r)} />
                  ))}
                </Row>
                <Txt variant="caption">
                  {rate <= 0.5 ? 'Empfohlen: nachhaltig und gut durchzuhalten.' : 'Ambitioniert – achte auf ausreichend Eiweiß und Schlaf.'}
                </Txt>
              </>
            ) : (
              <Txt color={colors.textSecondary}>Wir berechnen deinen Erhaltungsbedarf, damit du dein Gewicht hältst.</Txt>
            )}
          </View>
        )}

        {step === 5 && <Summary profile={profile} remindersOn={remindersOn} setRemindersOn={setRemindersOn} />}

        <View style={{ flex: 1 }} />
        <Row gap={10} style={{ marginTop: 24 }}>
          {step > 0 ? <Button title="Zurück" variant="secondary" onPress={() => setStep(step - 1)} full={false} style={{ flex: 1 }} /> : null}
          <Button
            testID="ob-next"
            title={step === 0 ? "Los geht's" : step === STEPS - 1 ? 'Fertig' : 'Weiter'}
            onPress={next}
            disabled={!canNext}
            loading={busy}
            full={false}
            style={{ flex: 2 }}
          />
        </Row>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Summary({
  profile,
  remindersOn,
  setRemindersOn,
}: {
  profile: Profile;
  remindersOn: boolean;
  setRemindersOn: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  const goals = goalsFromProfile(profile, profile.startWeightKg);
  const m = macroGrams(goals);
  const age = new Date().getFullYear() - profile.birthYear;
  const weeks = weeksToTarget(profile.startWeightKg, profile.targetWeightKg, profile.weeklyRateKg);
  const kcal = calorieGoal(profile, profile.startWeightKg);
  const clamped = profile.goal === 'lose' && kcal <= (profile.sex === 'male' ? 1500 : 1200);
  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h1">Dein persönlicher Plan{profile.name ? `, ${profile.name}` : ''}</Txt>
      <Card style={{ alignItems: 'center', gap: 4 }}>
        <Txt variant="label">Tägliches Kalorienziel</Txt>
        <Txt variant="title" color={colors.primary}>
          {formatNumber(kcal)} kcal
        </Txt>
        <Txt variant="caption" center>
          Grundumsatz {formatNumber(bmr(profile.sex, profile.startWeightKg, profile.heightCm, age))} kcal · Gesamtbedarf{' '}
          {formatNumber(tdee(profile, profile.startWeightKg))} kcal
        </Txt>
      </Card>
      {clamped ? (
        <Txt variant="caption" color={colors.warning}>
          Aus gesundheitlichen Gründen setzen wir dein Ziel nicht unter {profile.sex === 'male' ? '1.500' : '1.200'} kcal.
        </Txt>
      ) : null}
      <Row gap={10}>
        {[
          ['Eiweiß', m.protein, colors.protein],
          ['Kohlenh.', m.carbs, colors.carbs],
          ['Fett', m.fat, colors.fat],
        ].map(([l, v, c]) => (
          <Card key={l as string} style={{ flex: 1, alignItems: 'center', padding: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c as string, marginBottom: 4 }} />
            <Txt variant="h3">{v as number} g</Txt>
            <Txt variant="caption">{l as string}</Txt>
          </Card>
        ))}
      </Row>
      <Row gap={10}>
        <Card style={{ flex: 1, padding: 12 }}>
          <Txt variant="caption">Wasser</Txt>
          <Txt variant="h3">{formatNumber(goals.waterMl / 1000, 2)} l</Txt>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Txt variant="caption">Schritte</Txt>
          <Txt variant="h3">{formatNumber(goals.steps)}</Txt>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Txt variant="caption">Ziel in</Txt>
          <Txt variant="h3">{weeks == null ? '–' : `${weeks} Wo.`}</Txt>
        </Card>
      </Row>
      <Card onPress={() => setRemindersOn(!remindersOn)} testID="ob-reminders">
        <Row gap={12}>
          <Icon name={remindersOn ? 'checkbox-marked' : 'checkbox-blank-outline'} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Txt bold>Erinnerungen aktivieren</Txt>
            <Txt variant="small">Wasser, Mahlzeiten, Tages-Challenge (z. B. 10 Liegestütze) und Tagesziel-Check. Jederzeit anpassbar.</Txt>
          </View>
        </Row>
      </Card>
      <Txt variant="caption">Alle Werte kannst du später unter „Mehr → Ziele“ anpassen. Keine medizinische Beratung.</Txt>
    </View>
  );
}

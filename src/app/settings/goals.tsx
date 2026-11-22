import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { MacroSplitBar } from '../../components/charts';
import { useToast } from '../../components/Toast';
import { Button, Card, NumberInput, Row, Screen, Stepper, SwitchRow, Txt } from '../../components/ui';
import { bmr, calorieGoal, formatNumber, macroGrams, tdee, waterGoalMl } from '../../lib/calc';
import { latestWeightKg } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function GoalsSettings() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const g = state.goals;
  const weight = latestWeightKg(state);
  const auto = calorieGoal(state.profile, weight);
  const [manual, setManual] = useState<number | null>(g.calories);
  const [protein, setProtein] = useState(g.proteinPct);
  const [carbs, setCarbs] = useState(g.carbsPct);
  const [fat, setFat] = useState(g.fatPct);
  const [water, setWater] = useState<number | null>(g.waterMl);
  const [steps, setSteps] = useState<number | null>(g.steps);
  const [fiber, setFiber] = useState<number | null>(g.fiberG);
  const [sugar, setSugar] = useState<number | null>(g.sugarMaxG);
  const [workouts, setWorkouts] = useState(g.workoutsPerWeek);
  const [autoCal, setAutoCal] = useState(g.autoCalories);

  const sum = protein + carbs + fat;
  const cal = autoCal ? auto : (manual ?? 0);
  const m = macroGrams({ calories: cal, proteinPct: protein, carbsPct: carbs, fatPct: fat });
  const valid =
    sum === 100 &&
    (autoCal || (manual != null && manual >= 800 && manual <= 6000)) &&
    water != null &&
    water >= 500 &&
    water <= 8000 &&
    steps != null &&
    steps >= 0 &&
    steps <= 100000 &&
    fiber != null &&
    sugar != null;

  const save = () => {
    if (!valid) return;
    actions.updateGoals({
      autoCalories: autoCal,
      calories: autoCal ? auto : Math.round(manual ?? auto),
      proteinPct: protein,
      carbsPct: carbs,
      fatPct: fat,
      waterMl: Math.round(water!),
      steps: Math.round(steps!),
      fiberG: fiber!,
      sugarMaxG: sugar!,
      workoutsPerWeek: workouts,
    });
    toast({ message: 'Ziele gespeichert', icon: 'check' });
  };

  const age = new Date().getFullYear() - state.profile.birthYear;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card style={{ gap: 10 }}>
          <Txt variant="h3">Kalorien</Txt>
          <SwitchRow title="Automatisch berechnen" subtitle="Passt sich an Gewicht, Ziel und Aktivität an" value={autoCal} onChange={setAutoCal} testID="goals-auto" />
          {autoCal ? (
            <Txt>
              Empfohlen: <Txt bold>{formatNumber(auto)} kcal</Txt>
            </Txt>
          ) : (
            <NumberInput testID="goals-kcal" label="Tägliches Kalorienziel" suffix="kcal" value={manual} onChange={setManual} decimals={0} min={800} max={6000} />
          )}
          <Txt variant="caption">
            Grundumsatz {formatNumber(bmr(state.profile.sex, weight, state.profile.heightCm, age))} kcal · Gesamtumsatz {formatNumber(tdee(state.profile, weight))} kcal
          </Txt>
        </Card>

        <Card style={{ gap: 12 }}>
          <Row justify="space-between">
            <Txt variant="h3">Makro-Verteilung</Txt>
            <Txt bold color={sum === 100 ? colors.success : colors.danger}>
              {sum} %
            </Txt>
          </Row>
          <MacroRow label="Eiweiß" pct={protein} grams={m.protein} setPct={setProtein} color={colors.protein} />
          <MacroRow label="Kohlenhydrate" pct={carbs} grams={m.carbs} setPct={setCarbs} color={colors.carbs} />
          <MacroRow label="Fett" pct={fat} grams={m.fat} setPct={setFat} color={colors.fat} />
          <MacroSplitBar protein={m.protein} carbs={m.carbs} fat={m.fat} />
          {sum !== 100 ? (
            <Txt variant="caption" color={colors.danger}>
              Die Summe muss genau 100 % ergeben.
            </Txt>
          ) : null}
          <Row gap={6} wrap>
            <Button small variant="secondary" full={false} title="Ausgewogen" onPress={() => { setProtein(25); setCarbs(45); setFat(30); }} />
            <Button small variant="secondary" full={false} title="High Protein" onPress={() => { setProtein(35); setCarbs(35); setFat(30); }} />
            <Button small variant="secondary" full={false} title="Low Carb" onPress={() => { setProtein(30); setCarbs(20); setFat(50); }} />
          </Row>
          <Txt variant="caption">
            Eiweiß-Empfehlung für Training: ca. {formatNumber(weight * 1.6)}–{formatNumber(weight * 2)} g pro Tag (1,6–2 g/kg).
          </Txt>
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h3">Weitere Tagesziele</Txt>
          <NumberInput testID="goals-water" label="Wasser" suffix="ml" value={water} onChange={setWater} decimals={0} min={500} max={8000} hint={`Empfehlung für dich: ca. ${formatNumber(waterGoalMl(weight))} ml (35 ml/kg)`} />
          <NumberInput label="Schritte" value={steps} onChange={setSteps} decimals={0} min={0} max={100000} />
          <Row gap={10}>
            <NumberInput style={{ flex: 1 }} label="Ballaststoffe (min.)" suffix="g" value={fiber} onChange={setFiber} decimals={0} min={0} max={200} />
            <NumberInput style={{ flex: 1 }} label="Zucker (max.)" suffix="g" value={sugar} onChange={setSugar} decimals={0} min={0} max={500} />
          </Row>
          <Row justify="space-between">
            <Txt>Trainingstage pro Woche</Txt>
            <Stepper value={workouts} onChange={setWorkouts} min={1} max={7} format={(v) => String(v)} label="Trainingstage" />
          </Row>
        </Card>

        <Button title="Speichern" icon="content-save" onPress={save} disabled={!valid} testID="goals-save" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function MacroRow({ label, pct, grams, setPct, color }: { label: string; pct: number; grams: number; setPct: (v: number) => void; color: string }) {
  return (
    <Row justify="space-between">
      <Row gap={8} style={{ flex: 1 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Txt>{label}</Txt>
        <Txt variant="caption">{grams} g</Txt>
      </Row>
      <Stepper value={pct} onChange={setPct} step={5} min={5} max={80} format={(v) => `${v} %`} label={label} />
    </Row>
  );
}

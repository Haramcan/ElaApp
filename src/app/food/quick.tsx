import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Input, NumberInput, Row, Screen, Txt } from '../../components/ui';
import { useToday } from '../../lib/hooks';
import { MEALS, mealForNow } from '../../lib/selectors';
import { uid, useStore } from '../../lib/store';
import type { FoodItem, MealType } from '../../lib/types';

/** Log calories (and optionally macros) without a food item – e.g. at a restaurant */
export default function QuickAdd() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const [meal, setMeal] = useState<MealType>((MEALS.some((m) => m.id === params.meal) ? params.meal : mealForNow()) as MealType);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);

  const valid = kcal != null && kcal > 0 && kcal <= 10000;

  const save = () => {
    if (!valid || kcal == null) return;
    // values are stored "per 100" with an amount of 100 => totals equal the entered numbers
    const food: FoodItem = {
      id: uid('quick:'),
      name: name.trim() || 'Schnell-Eintrag',
      per100: { kcal, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 },
      unit: 'g',
      servingSize: 100,
      servingLabel: '1 Portion',
      source: 'quick',
    };
    actions.addFood(food, 100, meal, params.date || today);
    toast({ message: `${kcal} kcal eingetragen`, icon: 'check' });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Txt variant="small">Ideal für Restaurantbesuche oder wenn du die Kalorien schon kennst.</Txt>
        <Card style={{ gap: 12 }}>
          <Input label="Beschreibung (optional)" value={name} onChangeText={setName} placeholder="z. B. Pizza beim Italiener" maxLength={60} />
          <NumberInput testID="quick-kcal" label="Kalorien *" suffix="kcal" value={kcal} onChange={setKcal} decimals={0} min={1} max={10000} autoFocus />
          <Row gap={10}>
            <NumberInput style={{ flex: 1 }} label="Eiweiß" suffix="g" value={protein} onChange={setProtein} min={0} max={1000} />
            <NumberInput style={{ flex: 1 }} label="Kohlenh." suffix="g" value={carbs} onChange={setCarbs} min={0} max={1000} />
            <NumberInput style={{ flex: 1 }} label="Fett" suffix="g" value={fat} onChange={setFat} min={0} max={1000} />
          </Row>
          <Row gap={6} wrap>
            {MEALS.map((m) => (
              <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} />
            ))}
          </Row>
        </Card>
        <Button title="Eintragen" icon="check" onPress={save} disabled={!valid} testID="quick-save" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { AmountEditor, FoodHeader, useAmountState } from '../../components/FoodAmountEditor';
import { useToast } from '../../components/Toast';
import { Button, Card, EmptyState, IconButton, Row, Screen, Txt } from '../../components/ui';
import { addDays, formatDayLabel } from '../../lib/date';
import { useToday } from '../../lib/hooks';
import { useStore } from '../../lib/store';
import type { FoodEntry, MealType } from '../../lib/types';

export default function EditEntry() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state } = useStore();
  const entry = state.foodLog.find((e) => e.id === id);
  if (!entry) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="food-off" title="Eintrag nicht gefunden" text="Der Eintrag wurde vielleicht gelöscht." />
      </Screen>
    );
  }
  return <Inner entry={entry} />;
}

function Inner({ entry }: { entry: FoodEntry }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const [meal, setMeal] = useState<MealType>(entry.meal);
  const [date, setDate] = useState(entry.date);
  const st = useAmountState(entry.food, entry.amount);

  const save = () => {
    actions.updateFoodEntry(entry.id, { amount: st.amount, meal, date });
    toast({ message: 'Eintrag gespeichert', icon: 'check' });
    router.back();
  };

  const remove = () => {
    actions.removeFoodEntry(entry.id);
    toast({ message: 'Eintrag gelöscht', icon: 'delete', actionLabel: 'Rückgängig', onAction: () => actions.restoreFoodEntry(entry) });
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <FoodHeader food={entry.food} showNutri={state.settings.showNutriScore} />
      <Card>
        <Row justify="space-between">
          <IconButton icon="chevron-left" label="Einen Tag früher" onPress={() => setDate(addDays(date, -1))} />
          <Txt bold>{formatDayLabel(date, today)}</Txt>
          <IconButton icon="chevron-right" label="Einen Tag später" onPress={() => setDate(addDays(date, 1))} />
        </Row>
      </Card>
      <AmountEditor food={entry.food} st={st} meal={meal} setMeal={setMeal} energyUnit={state.settings.energyUnit} />
      <Button title="Speichern" icon="content-save" onPress={save} disabled={!(st.amount > 0)} testID="entry-save" />
      <Button
        title="Nochmal hinzufügen"
        icon="content-copy"
        variant="secondary"
        onPress={() => {
          actions.addFood(entry.food, st.amount, meal, today);
          toast({ message: `Für heute erneut eingetragen`, icon: 'check' });
          router.back();
        }}
      />
      <Button title="Löschen" icon="delete" variant="danger" onPress={remove} testID="entry-delete" />
    </Screen>
  );
}

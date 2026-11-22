import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { AmountEditor, FoodHeader, useAmountState } from '../../components/FoodAmountEditor';
import { useToast } from '../../components/Toast';
import { Button, EmptyState, IconButton, Row, Screen, Txt } from '../../components/ui';
import { formatNumber } from '../../lib/calc';
import { formatDayLabel } from '../../lib/date';
import { findFood } from '../../lib/foodCache';
import { useToday } from '../../lib/hooks';
import { useHaptics } from '../../lib/platform';
import { MEALS, mealForNow, mealLabel } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { FoodItem, MealType } from '../../lib/types';

export default function AddFood() {
  const params = useLocalSearchParams<{ foodId?: string; meal?: string; date?: string }>();
  const { state } = useStore();
  const food = findFood(params.foodId, state);
  if (!food) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="food-off" title="Lebensmittel nicht gefunden" text="Bitte suche das Lebensmittel erneut.">
          <Button title="Zur Suche" onPress={() => router.replace('/food/search')} full={false} />
        </EmptyState>
      </Screen>
    );
  }
  return <AddFoodInner food={food} initialMeal={params.meal} date={params.date} />;
}

function AddFoodInner({ food, initialMeal, date: dateParam }: { food: FoodItem; initialMeal?: string; date?: string }) {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const today = useToday();
  const date = dateParam || today;
  const [meal, setMeal] = useState<MealType>((MEALS.some((m) => m.id === initialMeal) ? initialMeal : mealForNow()) as MealType);
  const st = useAmountState(food);
  const isFav = state.favorites.some((f) => f.id === food.id);

  const add = () => {
    actions.addFood(food, st.amount, meal, date);
    haptics.success();
    toast({ message: `${food.name} (${formatNumber(st.amount)} ${food.unit}) hinzugefügt`, icon: 'check' });
    if (router.canGoBack()) router.back();
    else router.replace('/nutrition');
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Row gap={0}>
              {food.source === 'custom' ? (
                <IconButton icon="pencil" label="Bearbeiten" color={colors.primary} onPress={() => router.push({ pathname: '/food/custom', params: { id: food.id } })} />
              ) : null}
              <IconButton
                icon={isFav ? 'star' : 'star-outline'}
                label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}
                color={isFav ? colors.warning : colors.primary}
                testID="fav-toggle"
                onPress={() => {
                  actions.toggleFavorite(food);
                  toast(isFav ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt');
                }}
              />
            </Row>
          ),
        }}
      />
      <FoodHeader food={food} showNutri={state.settings.showNutriScore} />
      <AmountEditor food={food} st={st} meal={meal} setMeal={setMeal} energyUnit={state.settings.energyUnit} />
      <Txt variant="caption" center>
        Wird eingetragen: {formatDayLabel(date, today)} · {mealLabel(meal)}
      </Txt>
      <Button title="Hinzufügen" icon="plus" onPress={add} disabled={!(st.amount > 0)} testID="add-food-submit" />
    </Screen>
  );
}

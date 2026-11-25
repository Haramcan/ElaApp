import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Divider, Icon, Row, Screen, SectionHeader, Txt } from '../../components/ui';
import { energyValue, formatNumber } from '../../lib/calc';
import { useToday } from '../../lib/hooks';
import { useHaptics } from '../../lib/platform';
import { MEALS, mealForNow, mealLabel } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { suggestFood, type MealSuggestion } from '../../lib/suggest';
import { useTheme } from '../../lib/theme';
import type { MealType } from '../../lib/types';

export default function Suggest() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const today = useToday();
  const date = params.date || today;
  const [meal, setMeal] = useState<MealType>((MEALS.some((m) => m.id === params.meal) ? params.meal : mealForNow()) as MealType);
  const res = useMemo(() => suggestFood(state, date, meal), [state, date, meal]);
  const eu = state.settings.energyUnit;

  const log = (m: MealSuggestion, targetMeal: MealType) => {
    for (const i of m.items) actions.addFood(i.food, i.amount, targetMeal, date);
    haptics.success();
    toast({ message: `${m.title} zu ${mealLabel(targetMeal)} eingetragen`, icon: 'check', actionLabel: 'Tagebuch', onAction: () => router.navigate('/nutrition') });
  };

  const Item = ({ m, targetMeal, testID }: { m: MealSuggestion; targetMeal: MealType; testID?: string }) => (
    <Card style={{ gap: 8 }} testID={testID}>
      <Row justify="space-between" align="flex-start">
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h3">{m.title}</Txt>
          <Txt variant="caption">{m.reason}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt bold color={colors.primary}>
            {formatNumber(energyValue(m.kcal, eu))} {eu}
          </Txt>
          <Txt variant="caption">
            E {formatNumber(m.protein)} · K {formatNumber(m.carbs)} · F {formatNumber(m.fat)}
          </Txt>
        </View>
      </Row>
      {m.items.length > 1 || m.items[0]?.food.source === 'builtin' ? (
        <>
          <Divider />
          {m.items.map((i) => (
            <Row key={i.food.id} justify="space-between">
              <Txt variant="small" style={{ flex: 1 }}>
                {i.food.name}
              </Txt>
              <Txt variant="small" bold>
                {formatNumber(i.amount)} {i.food.unit}
              </Txt>
            </Row>
          ))}
        </>
      ) : null}
      <Button small title="Eintragen" icon="plus" variant="soft" onPress={() => log(m, targetMeal)} testID={testID ? `${testID}-log` : undefined} />
    </Card>
  );

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 6, backgroundColor: colors.primarySoft }}>
        <Row gap={10}>
          <Icon name="lightbulb-on-outline" color={colors.primary} />
          <Txt variant="h3" style={{ flex: 1 }}>
            Was kann ich noch essen?
          </Txt>
        </Row>
        <Txt variant="small" testID="suggest-message">
          {res.message}
        </Txt>
      </Card>
      <Row gap={6} wrap>
        {MEALS.map((m) => (
          <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} />
        ))}
      </Row>

      {res.meals.length > 0 ? <SectionHeader title={meal === 'snack' ? 'Passende Snacks' : `Ideen fürs ${mealLabel(meal)}`} /> : null}
      {res.meals.map((m, i) => (
        <Item key={m.title} m={m} targetMeal={meal} testID={i === 0 ? 'suggest-first' : undefined} />
      ))}

      {res.fromYourFoods.length > 0 ? <SectionHeader title="Aus deinen Lebensmitteln" /> : null}
      {res.fromYourFoods.map((m) => (
        <Item key={m.title} m={m} targetMeal={meal} />
      ))}

      {meal !== 'snack' && res.snacks.length > 0 ? <SectionHeader title="Kleine Snacks" /> : null}
      {meal !== 'snack' ? res.snacks.map((m) => <Item key={`s-${m.title}`} m={m} targetMeal="snack" />) : null}

      <Txt variant="caption" center>
        Die Mengen werden an dein restliches Tagesbudget angepasst. Du kannst Einträge danach im Tagebuch ändern.
      </Txt>
    </Screen>
  );
}

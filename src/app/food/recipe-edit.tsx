import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { MacroSplitBar } from '../../components/charts';
import { useToast } from '../../components/Toast';
import { Button, Card, Divider, EmptyState, IconButton, Input, NumberInput, Row, Screen, Stepper, Txt } from '../../components/ui';
import { energyValue, formatNumber, nutrientsFor } from '../../lib/calc';
import { putFood } from '../../lib/foodCache';
import { confirm } from '../../lib/platform';
import { recipeToFood, recipeTotals } from '../../lib/recipes';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function RecipeEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const r = state.recipes.find((x) => x.id === id);
  if (!r) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="chef-hat" title="Rezept nicht gefunden" />
      </Screen>
    );
  }
  const eu = state.settings.energyUnit;
  const t = recipeTotals(r);
  const per = (v: number) => v / Math.max(1, r.servings);
  const food = recipeToFood(r);
  const update = actions.updateRecipe;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card style={{ gap: 12 }}>
          <Input label="Name" value={r.name} onChangeText={(v) => update(r.id, (x) => ({ ...x, name: v }))} maxLength={60} testID="recipe-name" selectTextOnFocus />
          <Row justify="space-between">
            <Txt>Ergibt Portionen</Txt>
            <Stepper value={r.servings} onChange={(v) => update(r.id, (x) => ({ ...x, servings: v }))} min={1} max={30} format={(v) => String(v)} label="Portionen" testID="recipe-servings" />
          </Row>
        </Card>

        <Card style={{ gap: 10 }}>
          <Row justify="space-between">
            <Txt variant="h3">Pro Portion</Txt>
            <Txt variant="h3" color={colors.primary} testID="recipe-kcal">
              {formatNumber(energyValue(per(t.kcal), eu))} {eu}
            </Txt>
          </Row>
          <Txt variant="small">
            E {formatNumber(per(t.protein))} g · K {formatNumber(per(t.carbs))} g · F {formatNumber(per(t.fat))} g · {formatNumber(per(t.weight))} g
          </Txt>
          <MacroSplitBar protein={t.protein} carbs={t.carbs} fat={t.fat} />
          <Txt variant="caption">
            Gesamt: {formatNumber(energyValue(t.kcal, eu))} {eu} · {formatNumber(t.weight)} g
          </Txt>
        </Card>

        <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
          <Txt variant="h3" style={{ paddingVertical: 8 }}>
            Zutaten
          </Txt>
          {r.ingredients.length === 0 ? <Txt variant="small" style={{ paddingBottom: 10 }}>Noch keine Zutaten.</Txt> : null}
          {r.ingredients.map((ing, i) => (
            <View key={`${ing.food.id}-${i}`}>
              <Divider />
              <Row gap={8} style={{ paddingVertical: 8 }}>
                <View style={{ flex: 1 }}>
                  <Txt bold numberOfLines={2}>
                    {ing.food.name}
                  </Txt>
                  <Txt variant="caption">{formatNumber(nutrientsFor(ing.food, ing.amount).kcal)} kcal</Txt>
                </View>
                <View style={{ width: 110 }}>
                  <NumberInput
                    value={ing.amount}
                    suffix={ing.food.unit}
                    decimals={0}
                    min={1}
                    max={10000}
                    onChange={(v) => {
                      if (v != null && v > 0) update(r.id, (x) => ({ ...x, ingredients: x.ingredients.map((g, j) => (j === i ? { ...g, amount: v } : g)) }));
                    }}
                  />
                </View>
                <IconButton
                  icon="close"
                  size={18}
                  color={colors.muted}
                  label={`${ing.food.name} entfernen`}
                  onPress={() => update(r.id, (x) => ({ ...x, ingredients: x.ingredients.filter((_, j) => j !== i) }))}
                />
              </Row>
            </View>
          ))}
        </Card>
        <Row gap={10}>
          <Button title="Zutat suchen" icon="magnify" variant="soft" full={false} style={{ flex: 1 }} testID="recipe-add-ing" onPress={() => router.push({ pathname: '/food/search', params: { recipeId: r.id } })} />
          <Button title="Scannen" icon="barcode-scan" variant="soft" full={false} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/scan', params: { recipeId: r.id } })} />
        </Row>

        <Button
          title="Portion eintragen"
          icon="plus"
          disabled={!food}
          testID="recipe-log"
          onPress={() => {
            if (!food) return;
            putFood(food);
            router.push({ pathname: '/food/add', params: { foodId: food.id } });
          }}
        />
        <Button
          title="Rezept löschen"
          icon="delete"
          variant="danger"
          onPress={async () => {
            if (await confirm('Rezept löschen?', `„${r.name}“ wird gelöscht. Bereits eingetragene Portionen bleiben erhalten.`, 'Löschen', true)) {
              actions.deleteRecipe(r.id);
              toast('Rezept gelöscht');
              router.back();
            }
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, Icon, IconButton, Row, Screen, Txt } from '../../components/ui';
import { energyValue, formatNumber } from '../../lib/calc';
import { putFood } from '../../lib/foodCache';
import { recipeToFood, recipeTotals } from '../../lib/recipes';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function Recipes() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const eu = state.settings.energyUnit;

  return (
    <Screen edges={['bottom']}>
      <Txt variant="small">
        Speichere Gerichte aus mehreren Zutaten (z. B. „Omas Lasagne“) oder feste Mahlzeiten (z. B. „Mein Frühstück“) und trage sie später mit einem Tipp ein.
      </Txt>
      <Button
        title="Neues Rezept / neue Mahlzeit"
        icon="plus"
        testID="recipe-new"
        onPress={() => {
          const id = actions.createRecipe('Neues Rezept');
          router.push({ pathname: '/food/recipe-edit', params: { id } });
        }}
      />
      {state.recipes.length === 0 ? (
        <EmptyState
          icon="chef-hat"
          title="Noch keine Rezepte"
          text="Tipp: Im Ernährungstagebuch kannst du eine eingetragene Mahlzeit mit einem Tipp als Vorlage speichern."
        />
      ) : null}
      {state.recipes.map((r) => {
        const t = recipeTotals(r);
        const perPortion = t.kcal / Math.max(1, r.servings);
        const food = recipeToFood(r);
        return (
          <Card key={r.id} onPress={() => router.push({ pathname: '/food/recipe-edit', params: { id: r.id } })} testID={`recipe-${r.id}`}>
            <Row gap={12}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chef-hat" color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="h3" numberOfLines={2}>
                  {r.name}
                </Txt>
                <Txt variant="caption">
                  {r.ingredients.length} Zutaten · {r.servings} {r.servings === 1 ? 'Portion' : 'Portionen'} · {formatNumber(energyValue(perPortion, eu))} {eu}/Portion
                </Txt>
              </View>
              <IconButton
                icon="plus-circle"
                size={28}
                color={colors.primary}
                label={`${r.name} eintragen`}
                disabled={!food}
                testID={`recipe-log-${r.id}`}
                onPress={() => {
                  if (!food) return;
                  putFood(food);
                  router.push({ pathname: '/food/add', params: { foodId: food.id, meal: params.meal ?? '', date: params.date ?? '' } });
                }}
              />
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

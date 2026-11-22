import React, { useState } from 'react';
import { Image, View } from 'react-native';

import { energyValue, formatNumber, nutrientsFor } from '../lib/calc';
import { MEALS } from '../lib/selectors';
import { useTheme } from '../lib/theme';
import type { FoodItem, MealType } from '../lib/types';
import { MacroSplitBar } from './charts';
import { Card, Chip, Divider, NumberInput, NutriScore, Row, Segmented, Txt } from './ui';

export function FoodHeader({ food, showNutri }: { food: FoodItem; showNutri: boolean }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Row gap={12} align="flex-start">
        {food.imageUrl ? (
          <Image source={{ uri: food.imageUrl }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.cardAlt }} resizeMode="contain" />
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="h2">{food.name}</Txt>
          {food.brand ? <Txt variant="small">{food.brand}</Txt> : null}
          <Row gap={6} wrap>
            {showNutri ? <NutriScore grade={food.nutriScore} /> : null}
            {food.barcode ? <Txt variant="caption">EAN {food.barcode}</Txt> : null}
          </Row>
        </View>
      </Row>
    </Card>
  );
}

export function useAmountState(food: FoodItem, initialAmount?: number) {
  const hasServing = !!food.servingSize && food.servingSize > 0;
  const [mode, setMode] = useState<'unit' | 'serving'>(hasServing ? 'serving' : 'unit');
  const [servings, setServings] = useState<number | null>(
    hasServing && initialAmount != null ? Math.round((initialAmount / food.servingSize!) * 100) / 100 : 1,
  );
  const [grams, setGrams] = useState<number | null>(initialAmount ?? food.servingSize ?? 100);
  const amount = mode === 'serving' && hasServing ? (servings ?? 0) * food.servingSize! : (grams ?? 0);
  return { mode, setMode, servings, setServings, grams, setGrams, amount: Math.round(amount * 10) / 10, hasServing };
}

export function AmountEditor({
  food,
  st,
  meal,
  setMeal,
  energyUnit,
}: {
  food: FoodItem;
  st: ReturnType<typeof useAmountState>;
  meal: MealType;
  setMeal: (m: MealType) => void;
  energyUnit: 'kcal' | 'kJ';
}) {
  const { colors } = useTheme();
  const n = nutrientsFor(food, st.amount);
  const u = food.unit;
  return (
    <>
      <Card style={{ gap: 12 }}>
        {st.hasServing ? (
          <Segmented
            options={[
              { value: 'serving', label: food.servingLabel ? `Portion (${food.servingLabel})`.slice(0, 32) : `Portion (${formatNumber(food.servingSize!)} ${u})` },
              { value: 'unit', label: `Menge in ${u}` },
            ]}
            value={st.mode}
            onChange={(m) => {
              if (m === 'unit') st.setGrams(st.amount || food.servingSize || 100);
              else st.setServings(Math.round(((st.amount || food.servingSize!) / food.servingSize!) * 100) / 100);
              st.setMode(m);
            }}
          />
        ) : null}
        {st.mode === 'serving' && st.hasServing ? (
          <>
            <NumberInput testID="amount-servings" label="Anzahl Portionen" value={st.servings} onChange={st.setServings} decimals={2} min={0.01} max={50} />
            <Row gap={6} wrap>
              {[0.5, 1, 1.5, 2, 3].map((v) => (
                <Chip key={v} label={`${formatNumber(v, 1)}×`} selected={st.servings === v} onPress={() => st.setServings(v)} />
              ))}
            </Row>
          </>
        ) : (
          <>
            <NumberInput testID="amount-grams" label={`Menge (${u})`} suffix={u} value={st.grams} onChange={st.setGrams} decimals={1} min={0.1} max={5000} />
            <Row gap={6} wrap>
              {[25, 50, 100, 150, 200, 250].map((v) => (
                <Chip key={v} label={`${v} ${u}`} selected={st.grams === v} onPress={() => st.setGrams(v)} />
              ))}
            </Row>
          </>
        )}
        <Txt variant="small" bold>
          Mahlzeit
        </Txt>
        <Row gap={6} wrap>
          {MEALS.map((m) => (
            <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} testID={`add-meal-${m.id}`} />
          ))}
        </Row>
      </Card>

      <Card style={{ gap: 10 }}>
        <Row justify="space-between">
          <Txt variant="h3">
            Nährwerte für {formatNumber(st.amount, 1)} {u}
          </Txt>
        </Row>
        <Row justify="space-between">
          <Big label={energyUnit} value={formatNumber(energyValue(n.kcal, energyUnit))} color={colors.primary} />
          <Big label="Eiweiß" value={`${formatNumber(n.protein, 1)} g`} />
          <Big label="Kohlenh." value={`${formatNumber(n.carbs, 1)} g`} />
          <Big label="Fett" value={`${formatNumber(n.fat, 1)} g`} />
        </Row>
        <MacroSplitBar protein={n.protein} carbs={n.carbs} fat={n.fat} />
        <Divider />
        <Detail label="davon Zucker" value={food.per100.sugar != null ? `${formatNumber(n.sugar, 1)} g` : '–'} />
        <Detail label="davon gesättigte Fettsäuren" value={food.per100.satFat != null ? `${formatNumber(n.satFat, 1)} g` : '–'} />
        <Detail label="Ballaststoffe" value={food.per100.fiber != null ? `${formatNumber(n.fiber, 1)} g` : '–'} />
        <Detail label="Salz" value={food.per100.salt != null ? `${formatNumber(n.salt, 2)} g` : '–'} />
        <Txt variant="caption">
          Pro 100 {u}: {formatNumber(food.per100.kcal)} kcal · E {formatNumber(food.per100.protein, 1)} g · K {formatNumber(food.per100.carbs, 1)} g · F{' '}
          {formatNumber(food.per100.fat, 1)} g
        </Txt>
      </Card>
    </>
  );
}

function Big({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt variant="h3" color={color}>
        {value}
      </Txt>
      <Txt variant="caption">{label}</Txt>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Row justify="space-between">
      <Txt variant="small">{label}</Txt>
      <Txt variant="small" bold>
        {value}
      </Txt>
    </Row>
  );
}

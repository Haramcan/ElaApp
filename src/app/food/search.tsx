import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '../../components/Toast';
import { Chip, Icon, IconButton, Input, NutriScore, Row, Txt } from '../../components/ui';
import { energyValue, formatNumber } from '../../lib/calc';
import { putFood } from '../../lib/foodCache';
import { BUILTIN_FOODS, searchLocal } from '../../lib/foods';
import { useToday } from '../../lib/hooks';
import { OffError, searchProducts } from '../../lib/openfoodfacts';
import { useHaptics } from '../../lib/platform';
import { MEALS, mealForNow, mealLabel } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { FoodItem, MealType } from '../../lib/types';

type Tab = 'recent' | 'favorites' | 'custom';

export default function FoodSearch() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const today = useToday();
  const date = params.date || today;
  const [meal, setMeal] = useState<MealType>((MEALS.some((m) => m.id === params.meal) ? params.meal : mealForNow()) as MealType);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [online, setOnline] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const local = useMemo(
    () => (query.trim().length >= 1 ? searchLocal(query, [...state.customFoods, ...state.favorites, ...state.recentFoods, ...BUILTIN_FOODS], 15) : []),
    [query, state.customFoods, state.favorites, state.recentFoods],
  );

  useEffect(() => {
    const q = query.trim();
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setError(null);
      if (q.length < 3) {
        setOnline([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await searchProducts(q);
        if (id === reqId.current) setOnline(res);
      } catch (e) {
        if (id === reqId.current) setError(e instanceof OffError ? e.message : 'Suche fehlgeschlagen');
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, q.length < 3 ? 0 : 500);
    return () => clearTimeout(t);
  }, [query]);

  const open = (f: FoodItem) => {
    putFood(f);
    router.push({ pathname: '/food/add', params: { foodId: f.id, meal, date } });
  };

  const quickAdd = (f: FoodItem) => {
    const amount = f.servingSize ?? 100;
    actions.addFood(f, amount, meal, date);
    haptics.success();
    toast({ message: `${f.name} (${formatNumber(amount)} ${f.unit}) zu ${mealLabel(meal)} hinzugefügt`, icon: 'check' });
  };

  const searching = query.trim().length > 0;
  const localIds = new Set(local.map((f) => f.id));
  const onlineFiltered = online.filter((f) => !localIds.has(f.id));
  const listData: (FoodItem | { header: string })[] = searching
    ? [
        ...(local.length ? [{ header: 'Meine & Basis-Lebensmittel' }, ...local] : []),
        ...(onlineFiltered.length ? [{ header: 'Open Food Facts' }, ...onlineFiltered] : []),
      ]
    : tab === 'recent'
      ? state.recentFoods
      : tab === 'favorites'
        ? state.favorites
        : state.customFoods;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Row gap={8}>
          <View style={{ flex: 1 }}>
            <Input
              testID="food-search-input"
              placeholder="Lebensmittel oder Marke suchen …"
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <IconButton icon="barcode-scan" label="Barcode scannen" bg={colors.primarySoft} color={colors.primary} onPress={() => router.push({ pathname: '/scan', params: { meal, date } })} />
        </Row>
        <Row gap={6} wrap>
          {MEALS.map((m) => (
            <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} testID={`meal-chip-${m.id}`} />
          ))}
        </Row>
        {!searching ? (
          <Row gap={6}>
            <Chip label="Zuletzt" selected={tab === 'recent'} onPress={() => setTab('recent')} icon="history" />
            <Chip label="Favoriten" selected={tab === 'favorites'} onPress={() => setTab('favorites')} icon="star" />
            <Chip label="Eigene" selected={tab === 'custom'} onPress={() => setTab('custom')} icon="account" />
          </Row>
        ) : null}
        <Row gap={8}>
          <Pressable onPress={() => router.push({ pathname: '/food/quick', params: { meal, date } })} style={{ flex: 1 }} accessibilityRole="button" testID="food-quick">
            <Row gap={6} style={{ padding: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Icon name="lightning-bolt" size={18} color={colors.primary} />
              <Txt variant="small" bold>
                Nur Kalorien
              </Txt>
            </Row>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/food/custom', params: { meal, date } })} style={{ flex: 1 }} accessibilityRole="button" testID="food-custom">
            <Row gap={6} style={{ padding: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Icon name="plus" size={18} color={colors.primary} />
              <Txt variant="small" bold>
                Neu anlegen
              </Txt>
            </Row>
          </Pressable>
        </Row>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, i) => ('header' in item ? `h-${item.header}` : `${item.id}-${i}`)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        renderItem={({ item }) =>
          'header' in item ? (
            <Txt variant="label" style={{ marginTop: 12, marginBottom: 4 }}>
              {item.header}
            </Txt>
          ) : (
            <FoodRow
              food={item}
              unit={state.settings.energyUnit}
              showNutri={state.settings.showNutriScore}
              onPress={() => open(item)}
              onAdd={() => quickAdd(item)}
            />
          )
        }
        ListFooterComponent={
          searching ? (
            <View style={{ paddingVertical: 16, alignItems: 'center', gap: 8 }}>
              {loading ? <ActivityIndicator color={colors.primary} /> : null}
              {error ? (
                <Txt variant="small" color={colors.warning} center>
                  {error}. Lokale Ergebnisse werden trotzdem angezeigt.
                </Txt>
              ) : null}
              {!loading && !error && query.trim().length >= 3 && listData.length === 0 ? (
                <Txt variant="small" center>
                  Nichts gefunden. Lege das Lebensmittel selbst an oder nutze „Nur Kalorien“.
                </Txt>
              ) : null}
              {query.trim().length > 0 && query.trim().length < 3 ? (
                <Txt variant="caption" center>
                  Online-Suche ab 3 Zeichen
                </Txt>
              ) : null}
            </View>
          ) : listData.length === 0 ? (
            <View style={{ paddingVertical: 28, alignItems: 'center', gap: 6 }}>
              <Icon name={tab === 'favorites' ? 'star-outline' : tab === 'custom' ? 'account-outline' : 'history'} size={32} color={colors.muted} />
              <Txt variant="small" center>
                {tab === 'favorites'
                  ? 'Noch keine Favoriten. Markiere Lebensmittel mit dem Stern.'
                  : tab === 'custom'
                    ? 'Noch keine eigenen Lebensmittel angelegt.'
                    : 'Hier erscheinen deine zuletzt verwendeten Lebensmittel.'}
              </Txt>
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

function FoodRow({
  food,
  unit,
  showNutri,
  onPress,
  onAdd,
}: {
  food: FoodItem;
  unit: 'kcal' | 'kJ';
  showNutri: boolean;
  onPress: () => void;
  onAdd: () => void;
}) {
  const { colors } = useTheme();
  const serving = food.servingSize ?? 100;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={`food-row-${food.id}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt bold numberOfLines={2}>
          {food.name}
        </Txt>
        <Row gap={6} wrap>
          <Txt variant="caption" numberOfLines={1}>
            {food.brand ? `${food.brand} · ` : ''}
            {formatNumber(energyValue(food.per100.kcal, unit))} {unit}/100 {food.unit}
          </Txt>
          {showNutri ? <NutriScore grade={food.nutriScore} /> : null}
          {food.source === 'custom' ? <Icon name="account" size={14} color={colors.muted} /> : null}
        </Row>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt variant="small" bold>
          {formatNumber(energyValue((food.per100.kcal * serving) / 100, unit))} {unit}
        </Txt>
        <Txt variant="caption">
          {formatNumber(serving)} {food.unit}
        </Txt>
      </View>
      <IconButton icon="plus-circle" color={colors.primary} label={`${food.name} schnell hinzufügen`} onPress={onAdd} testID={`food-quickadd-${food.id}`} />
    </Pressable>
  );
}

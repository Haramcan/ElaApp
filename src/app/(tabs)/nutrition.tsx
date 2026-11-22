import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MacroSplitBar } from '../../components/charts';
import { useToast } from '../../components/Toast';
import { Button, Card, Divider, Icon, IconButton, ProgressBar, Row, Screen, Txt } from '../../components/ui';
import { energyValue, formatNumber, nutrientsFor } from '../../lib/calc';
import { addDays, formatDayLabel } from '../../lib/date';
import { useToday } from '../../lib/hooks';
import { useHaptics } from '../../lib/platform';
import { MEALS, daySummary, entriesFor } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { FoodEntry, MealType } from '../../lib/types';

export default function Nutrition() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const toast = useToast();
  const haptics = useHaptics();
  const [date, setDate] = useState(today);
  const entries = useMemo(() => entriesFor(state, date), [state, date]);
  const s = useMemo(() => daySummary(state, date), [state, date]);
  const unit = state.settings.energyUnit;

  const remove = (e: FoodEntry) => {
    haptics.medium();
    actions.removeFoodEntry(e.id);
    toast({ message: `„${e.food.name}“ gelöscht`, icon: 'delete', actionLabel: 'Rückgängig', onAction: () => actions.restoreFoodEntry(e) });
  };

  return (
    <Screen>
      <Row justify="space-between">
        <IconButton icon="chevron-left" label="Vorheriger Tag" onPress={() => setDate(addDays(date, -1))} testID="day-prev" />
        <Pressable onPress={() => setDate(today)} accessibilityRole="button" accessibilityLabel="Zu heute springen">
          <Txt variant="h2" center testID="day-label">
            {formatDayLabel(date, today)}
          </Txt>
        </Pressable>
        <IconButton icon="chevron-right" label="Nächster Tag" onPress={() => setDate(addDays(date, 1))} testID="day-next" />
      </Row>

      <Card>
        <Row justify="space-between">
          <Col label="Ziel" value={formatNumber(energyValue(s.goal, unit))} />
          <Txt variant="h3" color={colors.muted}>−</Txt>
          <Col label="Gegessen" value={formatNumber(energyValue(s.eaten, unit))} />
          <Txt variant="h3" color={colors.muted}>=</Txt>
          <Col
            label={s.remaining < 0 ? 'Zu viel' : 'Übrig'}
            value={formatNumber(energyValue(Math.abs(s.remaining), unit))}
            color={s.remaining < 0 ? colors.danger : colors.primary}
          />
        </Row>
        <View style={{ marginTop: 12 }}>
          <ProgressBar value={s.eaten} max={s.goal} overColor={colors.danger} />
        </View>
        <View style={{ marginTop: 14 }}>
          <MacroSplitBar protein={s.protein} carbs={s.carbs} fat={s.fat} />
        </View>
      </Card>

      <Row gap={10}>
        <Button title="Scannen" icon="barcode-scan" variant="soft" full={false} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/scan', params: { date } })} testID="nut-scan" />
        <Button title="Suchen" icon="magnify" variant="soft" full={false} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/food/search', params: { date } })} testID="nut-search" />
      </Row>

      {MEALS.map((m) => (
        <MealCard
          key={m.id}
          meal={m.id}
          label={m.label}
          icon={m.icon}
          date={date}
          entries={entries.filter((e) => e.meal === m.id)}
          unit={unit}
          onRemove={remove}
          onCopyYesterday={() => {
            const src = entriesFor(state, addDays(date, -1)).filter((e) => e.meal === m.id);
            actions.copyMeal(addDays(date, -1), m.id, date, m.id);
            toast({ message: `${src.length} Einträge von gestern übernommen`, icon: 'content-copy' });
          }}
          yesterdayCount={state.foodLog.filter((e) => e.date === addDays(date, -1) && e.meal === m.id).length}
        />
      ))}

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">Weitere Nährwerte</Txt>
        <NutrientRow label="Zucker" value={s.sugar} goal={state.goals.sugarMaxG} unit="g" limit />
        <NutrientRow label="Ballaststoffe" value={s.fiber} goal={state.goals.fiberG} unit="g" />
        <NutrientRow label="Salz" value={s.salt} goal={6} unit="g" limit decimals={1} />
      </Card>

      <Button title="Meine Lebensmittel & Favoriten" icon="star-outline" variant="secondary" onPress={() => router.push('/food/my-foods')} />
    </Screen>
  );
}

function Col({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt variant="h3" color={color}>
        {value}
      </Txt>
      <Txt variant="caption">{label}</Txt>
    </View>
  );
}

function NutrientRow({ label, value, goal, unit, limit, decimals = 0 }: { label: string; value: number; goal: number; unit: string; limit?: boolean; decimals?: number }) {
  const { colors } = useTheme();
  const bad = limit ? value > goal : false;
  return (
    <View style={{ gap: 4 }}>
      <Row justify="space-between">
        <Txt variant="small">{label}</Txt>
        <Txt variant="small" color={bad ? colors.danger : colors.textSecondary}>
          {formatNumber(value, decimals)} / {limit ? 'max. ' : ''}
          {formatNumber(goal, decimals)} {unit}
        </Txt>
      </Row>
      <ProgressBar value={value} max={goal} height={6} color={limit ? colors.warning : colors.primary} overColor={colors.danger} />
    </View>
  );
}

function MealCard({
  meal,
  label,
  icon,
  date,
  entries,
  unit,
  onRemove,
  onCopyYesterday,
  yesterdayCount,
}: {
  meal: MealType;
  label: string;
  icon: string;
  date: string;
  entries: FoodEntry[];
  unit: 'kcal' | 'kJ';
  onRemove: (e: FoodEntry) => void;
  onCopyYesterday: () => void;
  yesterdayCount: number;
}) {
  const { colors } = useTheme();
  const total = entries.reduce((sum, e) => sum + nutrientsFor(e.food, e.amount).kcal, 0);
  const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  return (
    <Card testID={`meal-${meal}`} style={{ gap: 4 }}>
      <Row justify="space-between">
        <Row gap={10}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={18} color={colors.primary} />
          </View>
          <View>
            <Txt variant="h3">{label}</Txt>
            <Txt variant="caption">
              {formatNumber(energyValue(total, unit))} {unit}
            </Txt>
          </View>
        </Row>
        <Row gap={2}>
          <IconButton icon="barcode-scan" label={`${label}: Barcode scannen`} color={colors.primary} onPress={() => router.push({ pathname: '/scan', params: { meal, date } })} />
          <IconButton
            icon="plus-circle"
            label={`${label}: Lebensmittel hinzufügen`}
            color={colors.primary}
            size={26}
            testID={`meal-add-${meal}`}
            onPress={() => router.push({ pathname: '/food/search', params: { meal, date } })}
          />
        </Row>
      </Row>
      {sorted.length > 0 ? <Divider /> : null}
      {sorted.map((e) => {
        const n = nutrientsFor(e.food, e.amount);
        return (
          <Pressable
            key={e.id}
            testID={`entry-${e.id}`}
            onPress={() => router.push({ pathname: '/food/entry', params: { id: e.id } })}
            onLongPress={() => onRemove(e)}
            accessibilityRole="button"
            accessibilityHint="Tippen zum Bearbeiten, lange drücken zum Löschen"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1}>{e.food.name}</Txt>
              <Txt variant="caption" numberOfLines={1}>
                {e.food.brand ? `${e.food.brand} · ` : ''}
                {e.food.source === 'quick' ? `${formatNumber(e.amount / 100, 2)} Portion` : `${formatNumber(e.amount)} ${e.food.unit}`} · E {formatNumber(n.protein)} · K {formatNumber(n.carbs)} · F {formatNumber(n.fat)}
              </Txt>
            </View>
            <Txt bold>{formatNumber(energyValue(n.kcal, unit))}</Txt>
            <IconButton icon="close" size={16} label={`${e.food.name} löschen`} color={colors.muted} onPress={() => onRemove(e)} />
          </Pressable>
        );
      })}
      {sorted.length === 0 && yesterdayCount > 0 ? (
        <Pressable onPress={onCopyYesterday} accessibilityRole="button" style={{ paddingTop: 6 }}>
          <Row gap={6}>
            <Icon name="content-copy" size={16} color={colors.primary} />
            <Txt variant="small" color={colors.primary} bold>
              Von gestern übernehmen ({yesterdayCount})
            </Txt>
          </Row>
        </Pressable>
      ) : null}
    </Card>
  );
}

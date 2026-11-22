import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useToast } from '../components/Toast';
import { Button, Card, Divider, EmptyState, IconButton, ListItem, NumberInput, Row, Screen, SectionHeader, Txt } from '../components/ui';
import { bmi, displayWeight, formatNumber, formatWeight, toKg } from '../lib/calc';
import { addDays, formatDayLabel } from '../lib/date';
import { useToday } from '../lib/hooks';
import { useHaptics } from '../lib/platform';
import { latestWeightKg, sortedWeights } from '../lib/selectors';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function Weight() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const today = useToday();
  const wu = state.settings.weightUnit;
  const [value, setValue] = useState<number | null>(displayWeight(latestWeightKg(state), wu));
  const [bodyFat, setBodyFat] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const list = useMemo(() => sortedWeights(state).reverse(), [state]);
  const minV = wu === 'kg' ? 30 : 66;
  const maxV = wu === 'kg' ? 300 : 660;
  const valid = value != null && value >= minV && value <= maxV && (bodyFat == null || (bodyFat > 2 && bodyFat < 70)) && (waist == null || (waist > 30 && waist < 250));
  const existing = state.weights.find((w) => w.date === date);

  const save = () => {
    if (!valid || value == null) return;
    const kg = Math.round(toKg(value, wu) * 100) / 100;
    actions.addWeight({ date, kg, bodyFatPct: bodyFat ?? undefined, waistCm: waist ?? undefined });
    haptics.success();
    const prev = list.find((w) => w.date < date);
    const diff = prev ? kg - prev.kg : 0;
    toast({
      message: prev ? `Gespeichert (${diff > 0 ? '+' : ''}${formatNumber(displayWeight(diff, wu), 1)} ${wu} seit ${formatDayLabel(prev.date, today)})` : 'Gewicht gespeichert',
      icon: 'scale-bathroom',
    });
    setBodyFat(null);
    setWaist(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card style={{ gap: 12 }}>
          <Row justify="space-between">
            <IconButton icon="chevron-left" label="Tag zurück" onPress={() => setDate(addDays(date, -1))} />
            <Txt bold>{formatDayLabel(date, today)}</Txt>
            <IconButton icon="chevron-right" label="Tag vor" onPress={() => setDate(addDays(date, 1))} disabled={date >= today} />
          </Row>
          <NumberInput testID="weight-input" label="Gewicht" suffix={wu} value={value} onChange={setValue} min={minV} max={maxV} />
          <Row gap={10}>
            <NumberInput style={{ flex: 1 }} label="Körperfett (opt.)" suffix="%" value={bodyFat} onChange={setBodyFat} min={3} max={69} />
            <NumberInput style={{ flex: 1 }} label="Taille (opt.)" suffix="cm" value={waist} onChange={setWaist} min={31} max={249} />
          </Row>
          {existing ? (
            <Txt variant="caption" color={colors.warning}>
              Für diesen Tag existiert bereits ein Eintrag ({formatWeight(existing.kg, wu)}) – er wird ersetzt.
            </Txt>
          ) : null}
          <Button title="Speichern" icon="content-save" onPress={save} disabled={!valid} testID="weight-save" />
          <Txt variant="caption">Tipp: Wiege dich morgens nach dem Toilettengang, vor dem Frühstück – so sind die Werte vergleichbar.</Txt>
        </Card>

        <SectionHeader title="Verlauf" />
        {list.length === 0 ? (
          <EmptyState icon="scale-bathroom" title="Noch keine Einträge" />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: 14 }}>
            {list.map((w, i) => {
              const prev = list[i + 1];
              const diff = prev ? w.kg - prev.kg : null;
              return (
                <React.Fragment key={w.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListItem
                    title={formatWeight(w.kg, wu)}
                    subtitle={[
                      formatDayLabel(w.date, today),
                      diff != null ? `${diff > 0 ? '+' : ''}${formatNumber(displayWeight(diff, wu), 1)} ${wu}` : null,
                      `BMI ${formatNumber(bmi(w.kg, state.profile.heightCm), 1)}`,
                      w.bodyFatPct ? `${formatNumber(w.bodyFatPct, 1)} % KFA` : null,
                      w.waistCm ? `Taille ${formatNumber(w.waistCm)} cm` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    right={
                      <IconButton
                        icon="delete-outline"
                        size={18}
                        color={colors.muted}
                        label="Eintrag löschen"
                        disabled={state.weights.length <= 1}
                        onPress={() => {
                          actions.removeWeight(w.id);
                          toast('Eintrag gelöscht');
                        }}
                      />
                    }
                  />
                </React.Fragment>
              );
            })}
          </Card>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

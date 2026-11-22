import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Input, NumberInput, Row, Screen, Segmented, Txt } from '../../components/ui';
import { formatNumber, kcalFromMacros } from '../../lib/calc';
import { putFood } from '../../lib/foodCache';
import { confirm } from '../../lib/platform';
import { uid, useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { FoodItem } from '../../lib/types';

export default function CustomFood() {
  const params = useLocalSearchParams<{ id?: string; barcode?: string; meal?: string; date?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const existing = params.id ? state.customFoods.find((f) => f.id === params.id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [barcode, setBarcode] = useState(existing?.barcode ?? params.barcode ?? '');
  const [unit, setUnit] = useState<'g' | 'ml'>(existing?.unit ?? 'g');
  const [kcal, setKcal] = useState<number | null>(existing?.per100.kcal ?? null);
  const [protein, setProtein] = useState<number | null>(existing?.per100.protein ?? null);
  const [carbs, setCarbs] = useState<number | null>(existing?.per100.carbs ?? null);
  const [fat, setFat] = useState<number | null>(existing?.per100.fat ?? null);
  const [sugar, setSugar] = useState<number | null>(existing?.per100.sugar ?? null);
  const [fiber, setFiber] = useState<number | null>(existing?.per100.fiber ?? null);
  const [salt, setSalt] = useState<number | null>(existing?.per100.salt ?? null);
  const [serving, setServing] = useState<number | null>(existing?.servingSize ?? null);
  const [servingLabel, setServingLabel] = useState(existing?.servingLabel ?? '');

  const macroKcal = kcalFromMacros(protein ?? 0, carbs ?? 0, fat ?? 0);
  const valid =
    name.trim().length > 0 &&
    kcal != null &&
    kcal >= 0 &&
    kcal <= 950 &&
    [protein, carbs, fat].every((v) => v == null || (v >= 0 && v <= 100)) &&
    (protein ?? 0) + (carbs ?? 0) + (fat ?? 0) <= 100 &&
    (serving == null || serving > 0) &&
    (barcode === '' || /^\d{6,14}$/.test(barcode));

  const save = () => {
    if (!valid || kcal == null) return;
    const food: FoodItem = {
      id: existing?.id ?? uid('custom:'),
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
      unit,
      per100: {
        kcal,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        sugar: sugar ?? undefined,
        fiber: fiber ?? undefined,
        salt: salt ?? undefined,
      },
      servingSize: serving ?? undefined,
      servingLabel: servingLabel.trim() || undefined,
      source: 'custom',
    };
    actions.saveCustomFood(food);
    putFood(food);
    toast({ message: existing ? 'Lebensmittel aktualisiert' : 'Lebensmittel gespeichert', icon: 'check' });
    if (!existing && (params.meal !== undefined || params.date !== undefined || params.barcode)) {
      router.replace({ pathname: '/food/add', params: { foodId: food.id, meal: params.meal ?? '', date: params.date ?? '' } });
    } else {
      router.back();
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm('Lebensmittel löschen?', `„${existing.name}“ wird aus deinen Lebensmitteln entfernt. Bereits eingetragene Mahlzeiten bleiben erhalten.`, 'Löschen', true);
    if (!ok) return;
    actions.deleteCustomFood(existing.id);
    toast('Lebensmittel gelöscht');
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Card style={{ gap: 12 }}>
          <Input testID="custom-name" label="Name *" value={name} onChangeText={setName} placeholder="z. B. Omas Apfelkuchen" maxLength={80} />
          <Input label="Marke (optional)" value={brand} onChangeText={setBrand} maxLength={60} />
          <Input
            label="Barcode (optional)"
            value={barcode}
            onChangeText={(t) => setBarcode(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={14}
            hint="Beim nächsten Scan wird dieses Produkt automatisch erkannt."
            error={barcode !== '' && !/^\d{6,14}$/.test(barcode) ? 'Ungültiger Barcode' : undefined}
          />
          <Segmented
            options={[
              { value: 'g', label: 'Fest (g)' },
              { value: 'ml', label: 'Flüssig (ml)' },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h3">Nährwerte pro 100 {unit}</Txt>
          <NumberInput testID="custom-kcal" label="Kalorien *" suffix="kcal" value={kcal} onChange={setKcal} decimals={0} min={0} max={950} />
          <Row gap={10}>
            <NumberInput testID="custom-protein" style={{ flex: 1 }} label="Eiweiß" suffix="g" value={protein} onChange={setProtein} min={0} max={100} />
            <NumberInput testID="custom-carbs" style={{ flex: 1 }} label="Kohlenh." suffix="g" value={carbs} onChange={setCarbs} min={0} max={100} />
          </Row>
          <Row gap={10}>
            <NumberInput testID="custom-fat" style={{ flex: 1 }} label="Fett" suffix="g" value={fat} onChange={setFat} min={0} max={100} />
            <NumberInput style={{ flex: 1 }} label="Zucker" suffix="g" value={sugar} onChange={setSugar} min={0} max={100} />
          </Row>
          <Row gap={10}>
            <NumberInput style={{ flex: 1 }} label="Ballaststoffe" suffix="g" value={fiber} onChange={setFiber} min={0} max={100} />
            <NumberInput style={{ flex: 1 }} label="Salz" suffix="g" value={salt} onChange={setSalt} decimals={2} min={0} max={100} />
          </Row>
          {kcal == null && macroKcal > 0 ? (
            <Button small variant="soft" title={`Kalorien aus Makros übernehmen (${formatNumber(macroKcal)} kcal)`} onPress={() => setKcal(macroKcal)} />
          ) : null}
          {kcal != null && macroKcal > 0 && Math.abs(macroKcal - kcal) > Math.max(30, kcal * 0.25) ? (
            <Txt variant="caption" color={colors.warning}>
              Hinweis: Aus den Makros ergeben sich ca. {formatNumber(macroKcal)} kcal. Bitte Werte prüfen.
            </Txt>
          ) : null}
          {(protein ?? 0) + (carbs ?? 0) + (fat ?? 0) > 100 ? (
            <Txt variant="caption" color={colors.danger}>
              Eiweiß, Kohlenhydrate und Fett können zusammen nicht mehr als 100 g pro 100 {unit} ergeben.
            </Txt>
          ) : null}
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h3">Portion (optional)</Txt>
          <Row gap={10}>
            <NumberInput style={{ flex: 1 }} label="Portionsgröße" suffix={unit} value={serving} onChange={setServing} min={0.1} max={5000} />
            <Input style={{ flex: 1 }} label="Bezeichnung" value={servingLabel} onChangeText={setServingLabel} placeholder="1 Stück" maxLength={30} />
          </Row>
        </Card>

        <Button title="Speichern" icon="content-save" onPress={save} disabled={!valid} testID="custom-save" />
        {existing ? <Button title="Löschen" icon="delete" variant="danger" onPress={() => void remove()} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

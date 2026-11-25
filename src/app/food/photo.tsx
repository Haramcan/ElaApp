import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, View } from 'react-native';

import { useToast } from '../../components/Toast';
import { Badge, Button, Card, Chip, Divider, IconButton, Input, NumberInput, Row, Screen, Txt } from '../../components/ui';
import { energyValue, formatNumber } from '../../lib/calc';
import { AiError, analyzeMealPhoto, getApiKey, type AiFoodItem, type AiMealResult } from '../../lib/ai';
import { useToday } from '../../lib/hooks';
import { pickImage, type PhotoSource } from '../../lib/photos';
import { useHaptics } from '../../lib/platform';
import { MEALS, mealForNow, mealLabel } from '../../lib/selectors';
import { uid, useStore } from '../../lib/store';
import { radius, useTheme } from '../../lib/theme';
import type { FoodItem, MealType } from '../../lib/types';

/** item with the originally estimated values (to rescale when grams change) */
interface EditItem extends AiFoodItem {
  key: string;
  base: AiFoodItem;
}

async function toJpegBase64(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1024 });
  const img = await ctx.renderAsync();
  const res = await img.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: 0.7 });
  if (!res.base64) throw new Error('Bild konnte nicht verarbeitet werden');
  return res.base64.replace(/^data:image\/\w+;base64,/, '');
}

export default function FoodPhoto() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const today = useToday();
  const date = params.date || today;
  const [meal, setMeal] = useState<MealType>((MEALS.some((m) => m.id === params.meal) ? params.meal : mealForNow()) as MealType);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiMealResult | null>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  const eu = state.settings.energyUnit;

  useFocusEffect(
    useCallback(() => {
      void getApiKey().then((k) => setHasKey(!!k));
    }, []),
  );

  const choose = async (source: PhotoSource) => {
    setError(null);
    try {
      const asset = await pickImage(source, { quality: 0.8 });
      if (!asset) return;
      setImageUri(asset.uri);
      setResult(null);
      setItems([]);
      setBase64(await toJpegBase64(asset.uri));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto konnte nicht geladen werden');
    }
  };

  const analyze = async () => {
    if (!base64) return;
    setBusy(true);
    setError(null);
    try {
      const r = await analyzeMealPhoto(base64, hint);
      setResult(r);
      setItems(r.items.map((i) => ({ ...i, key: uid('ai_'), base: i })));
      haptics.success();
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Analyse fehlgeschlagen');
      if (e instanceof AiError && (e.kind === 'nokey' || e.kind === 'auth')) setHasKey(e.kind === 'auth');
    } finally {
      setBusy(false);
    }
  };

  const setGrams = (key: string, g: number | null) =>
    setItems((list) =>
      list.map((i) => {
        if (i.key !== key || g == null || g <= 0) return i;
        const f = g / Math.max(1, i.base.grams);
        return { ...i, grams: g, kcal: Math.round(i.base.kcal * f), protein: i.base.protein * f, carbs: i.base.carbs * f, fat: i.base.fat * f };
      }),
    );

  const total = items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const save = () => {
    for (const i of items) {
      const f = 100 / Math.max(1, i.grams);
      const food: FoodItem = {
        id: uid('ai:'),
        name: i.name,
        brand: 'KI-Schätzung',
        per100: { kcal: Math.round(i.kcal * f), protein: Math.round(i.protein * f * 10) / 10, carbs: Math.round(i.carbs * f * 10) / 10, fat: Math.round(i.fat * f * 10) / 10 },
        unit: 'g',
        source: 'ai',
      };
      actions.addFood(food, i.grams, meal, date);
    }
    haptics.success();
    toast({ message: `${items.length} Lebensmittel zu ${mealLabel(meal)} eingetragen`, icon: 'check' });
    router.back();
  };

  if (hasKey === false) {
    return (
      <Screen edges={['bottom']}>
        <Card style={{ gap: 10 }}>
          <Txt variant="h2">Kalorien per Foto 📸</Txt>
          <Txt variant="small">
            Fotografiere dein Essen – eine KI (Claude von Anthropic) erkennt die Lebensmittel und schätzt Menge und Nährwerte. Du prüfst und korrigierst alles, bevor es
            eingetragen wird.
          </Txt>
          <Txt variant="small">Dafür brauchst du einen eigenen Claude-API-Schlüssel. Er wird verschlüsselt nur auf deinem Handy gespeichert.</Txt>
          <Button title="API-Schlüssel einrichten" icon="key" onPress={() => router.push('/settings/ai')} testID="photo-setup-key" />
        </Card>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Row gap={10}>
          <Button title="Foto aufnehmen" icon="camera" full={false} style={{ flex: 1 }} onPress={() => void choose('camera')} testID="ai-camera" />
          <Button title="Aus Galerie" icon="image" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => void choose('library')} testID="ai-library" />
        </Row>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.cardAlt }} resizeMode="cover" />
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
            <Txt variant="h3">📸 Mach ein Foto von deinem Essen</Txt>
            <Txt variant="small" center>
              Am besten von schräg oben, mit dem ganzen Teller im Bild.
            </Txt>
          </Card>
        )}

        {imageUri && !result ? (
          <>
            <Input label="Hinweis (optional)" value={hint} onChangeText={setHint} placeholder="z. B. mit Olivenöl gebraten, großer Teller" maxLength={120} />
            <Button title={busy ? 'Analysiere …' : 'Kalorien schätzen'} icon="auto-fix" onPress={() => void analyze()} loading={busy} disabled={!base64} testID="ai-analyze" />
          </>
        ) : null}
        {busy ? (
          <Row gap={8} justify="center">
            <ActivityIndicator color={colors.primary} />
            <Txt variant="small">Die KI schaut sich dein Essen an …</Txt>
          </Row>
        ) : null}
        {error ? (
          <Txt variant="small" color={colors.danger}>
            {error}
          </Txt>
        ) : null}

        {result ? (
          <>
            <Card style={{ gap: 6 }}>
              <Row justify="space-between">
                <Txt variant="h3">Erkannt</Txt>
                <Badge label={`Sicherheit: ${result.confidence}`} color={result.confidence === 'niedrig' ? colors.warning : colors.primary} bg={result.confidence === 'niedrig' ? colors.warningSoft : colors.primarySoft} />
              </Row>
              {result.note ? <Txt variant="small">{result.note}</Txt> : null}
            </Card>
            {items.length === 0 ? <Txt variant="small">Keine Lebensmittel erkannt.</Txt> : null}
            <Card padded={false} style={{ paddingHorizontal: 14 }}>
              {items.map((i, idx) => (
                <View key={i.key}>
                  {idx > 0 ? <Divider /> : null}
                  <Row gap={8} style={{ paddingVertical: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Txt bold>{i.name}</Txt>
                      <Txt variant="caption">
                        {formatNumber(energyValue(i.kcal, eu))} {eu} · E {formatNumber(i.protein)} · K {formatNumber(i.carbs)} · F {formatNumber(i.fat)}
                      </Txt>
                    </View>
                    <View style={{ width: 100 }}>
                      <NumberInput value={i.grams} suffix="g" decimals={0} min={1} max={3000} onChange={(v) => setGrams(i.key, v)} />
                    </View>
                    <IconButton icon="close" size={18} color={colors.muted} label={`${i.name} entfernen`} onPress={() => setItems((l) => l.filter((x) => x.key !== i.key))} />
                  </Row>
                </View>
              ))}
            </Card>
            <Card style={{ alignItems: 'center' }}>
              <Txt variant="caption">Gesamt</Txt>
              <Txt variant="title" color={colors.primary} testID="ai-total">
                {formatNumber(energyValue(total.kcal, eu))} {eu}
              </Txt>
              <Txt variant="caption">
                E {formatNumber(total.protein)} g · K {formatNumber(total.carbs)} g · F {formatNumber(total.fat)} g
              </Txt>
            </Card>
            <Row gap={6} wrap>
              {MEALS.map((m) => (
                <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} />
              ))}
            </Row>
            <Button title="Eintragen" icon="check" onPress={save} disabled={items.length === 0} testID="ai-save" />
            <Button title="Neu analysieren" variant="ghost" onPress={() => setResult(null)} />
          </>
        ) : null}
        <Txt variant="caption" center>
          KI-Schätzungen können danebenliegen – prüfe die Mengen. Das Foto wird zur Analyse an Anthropic gesendet.
        </Txt>
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Icon, IconButton, Input, Row, Txt } from '../components/ui';
import { findByBarcode, putFood } from '../lib/foodCache';
import { fetchProductByBarcode, isValidBarcode, OffError } from '../lib/openfoodfacts';
import { useHaptics } from '../lib/platform';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

type Status = { kind: 'scanning' } | { kind: 'loading'; code: string } | { kind: 'notfound'; code: string; message: string } | { kind: 'error'; code: string; message: string };

export default function Scan() {
  const params = useLocalSearchParams<{ meal?: string; date?: string; recipeId?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'scanning' });
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const locked = useRef(false);

  const lookup = useCallback(
    async (barcode: string) => {
      const clean = barcode.trim();
      setStatus({ kind: 'loading', code: clean });
      actions.incrementStat('scans');
      try {
        const local = findByBarcode(clean, state);
        const food = local ?? (await fetchProductByBarcode(clean));
        putFood(food);
        haptics.success();
        router.replace({ pathname: '/food/add', params: { foodId: food.id, meal: params.meal ?? '', date: params.date ?? '', recipeId: params.recipeId ?? '' } });
      } catch (e) {
        haptics.warning();
        const err = e instanceof OffError ? e : new OffError('Unbekannter Fehler', 'network');
        if (err.kind === 'notfound' || err.kind === 'invalid') setStatus({ kind: 'notfound', code: clean, message: err.message });
        else setStatus({ kind: 'error', code: clean, message: err.message });
      }
    },
    [actions, haptics, params.date, params.meal, params.recipeId, state],
  );

  const onScanned = useCallback(
    (res: BarcodeScanningResult) => {
      if (locked.current) return;
      const data = String(res.data ?? '').trim();
      if (!isValidBarcode(data)) return;
      locked.current = true;
      haptics.medium();
      void lookup(data);
    },
    [haptics, lookup],
  );

  const retry = () => {
    locked.current = false;
    setStatus({ kind: 'scanning' });
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const cameraUsable = permission?.granted && !manual;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {cameraUsable ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={status.kind === 'scanning' ? onScanned : undefined}
        />
      ) : null}

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Row justify="space-between" style={{ paddingHorizontal: 12 }}>
          <IconButton icon="close" label="Schließen" color="#fff" bg="rgba(0,0,0,0.4)" onPress={close} testID="scan-close" />
          <Txt variant="h3" color="#fff">
            Barcode scannen
          </Txt>
          {cameraUsable ? (
            <IconButton icon={torch ? 'flashlight-off' : 'flashlight'} label="Taschenlampe" color="#fff" bg="rgba(0,0,0,0.4)" onPress={() => setTorch(!torch)} />
          ) : (
            <View style={{ width: 40 }} />
          )}
        </Row>

        {cameraUsable && status.kind === 'scanning' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <View style={{ width: '78%', maxWidth: 340, aspectRatio: 1.6, borderRadius: 18, borderWidth: 3, borderColor: '#fff' }} />
            <Txt color="#fff" center style={{ marginTop: 16, paddingHorizontal: 24 }}>
              Halte den Barcode in den Rahmen – er wird automatisch erkannt.
            </Txt>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ padding: 16, gap: 10 }}>
          {permission && !permission.granted && !manual ? (
            <Card style={{ gap: 10 }}>
              <Txt variant="h3">Kamerazugriff benötigt</Txt>
              <Txt variant="small">Um Barcodes zu scannen, braucht die App Zugriff auf deine Kamera. Alternativ kannst du den Code manuell eingeben.</Txt>
              {permission.canAskAgain ? (
                <Button title="Kamera erlauben" icon="camera" onPress={() => void requestPermission()} testID="scan-allow" />
              ) : (
                <Button title="Einstellungen öffnen" icon="cog" onPress={() => void Linking.openSettings()} />
              )}
            </Card>
          ) : null}
          {!permission ? <ActivityIndicator color="#fff" /> : null}

          {status.kind === 'loading' ? (
            <Card style={{ alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={colors.primary} />
              <Txt>Suche Produkt {status.code} …</Txt>
            </Card>
          ) : null}

          {status.kind === 'notfound' || status.kind === 'error' ? (
            <Card style={{ gap: 10 }} testID="scan-result-error">
              <Row gap={8}>
                <Icon name={status.kind === 'notfound' ? 'help-circle-outline' : 'wifi-off'} color={colors.warning} />
                <Txt variant="h3" style={{ flex: 1 }}>
                  {status.message}
                </Txt>
              </Row>
              <Txt variant="small">Barcode: {status.code}</Txt>
              {status.kind === 'notfound' ? (
                <Button
                  title="Produkt selbst anlegen"
                  icon="plus"
                  testID="scan-create"
                  onPress={() => router.replace({ pathname: '/food/custom', params: { barcode: status.code, meal: params.meal ?? '', date: params.date ?? '', recipeId: params.recipeId ?? '' } })}
                />
              ) : (
                <Button title="Erneut versuchen" icon="refresh" onPress={() => void lookup(status.code)} />
              )}
              <Button title="Weiter scannen" variant="secondary" onPress={retry} />
            </Card>
          ) : null}

          {status.kind === 'scanning' ? (
            manual || !cameraUsable ? (
              <Card style={{ gap: 10 }}>
                <Input
                  testID="scan-manual-input"
                  label="Barcode (EAN) eingeben"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="z. B. 4000417025005"
                  maxLength={14}
                  error={code.length > 0 && !isValidBarcode(code) ? 'Ein Barcode hat 8 bis 13 Ziffern' : undefined}
                  onSubmitEditing={() => isValidBarcode(code) && void lookup(code)}
                />
                <Button title="Produkt suchen" icon="magnify" testID="scan-manual-submit" disabled={!isValidBarcode(code)} onPress={() => void lookup(code)} />
                {permission?.granted ? <Button title="Zurück zur Kamera" variant="secondary" onPress={() => setManual(false)} /> : null}
              </Card>
            ) : (
              <Pressable onPress={() => setManual(true)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }} testID="scan-manual">
                <Row gap={6}>
                  <Icon name="keyboard-outline" color="#fff" />
                  <Txt color="#fff" bold>
                    Code manuell eingeben
                  </Txt>
                </Row>
              </Pressable>
            )
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

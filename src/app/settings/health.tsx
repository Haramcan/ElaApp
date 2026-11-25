import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Icon, Row, Screen, SwitchRow, Txt } from '../../components/ui';
import { connectHealth, healthAvailable, healthName, openHealthSettings, readHealth } from '../../lib/health';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function HealthSettings() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void healthAvailable().then(setAvailable);
  }, []);

  const sync = async () => {
    setBusy(true);
    const data = await readHealth(14);
    actions.mergeHealthData(data);
    setBusy(false);
    const n = Object.keys(data.steps).length + Object.keys(data.sleep).length + data.weights.length;
    toast({ message: n > 0 ? `${n} Werte aus ${healthName} übernommen` : 'Keine neuen Daten gefunden', icon: 'sync' });
  };

  const enable = async (on: boolean) => {
    if (!on) {
      actions.updateSettings({ healthSync: false });
      return;
    }
    setBusy(true);
    const ok = await connectHealth();
    setBusy(false);
    if (!ok) {
      toast({ message: `Zugriff auf ${healthName ?? 'Health'} wurde nicht erlaubt`, icon: 'alert-circle-outline' });
      return;
    }
    actions.updateSettings({ healthSync: true });
    await sync();
  };

  if (!healthName) {
    return (
      <Screen edges={['bottom']}>
        <Card>
          <Txt variant="small">Die Verbindung zu Apple Health bzw. Health Connect gibt es nur in der iPhone- und Android-App.</Txt>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 8 }}>
        <Row gap={10}>
          <Icon name="heart-pulse" color={colors.danger} />
          <Txt variant="h3">{healthName}</Txt>
        </Row>
        <Txt variant="small">
          Verbinde FitLife mit {healthName}, damit Schritte, Schlaf und Gewicht automatisch übernommen werden – z. B. von deiner Smartwatch. Deine Trainings und dein
          Gewicht werden umgekehrt in {healthName} gespeichert.
        </Txt>
        {available === false ? (
          <Txt variant="small" color={colors.warning}>
            {Platform.OS === 'android'
              ? 'Health Connect ist auf diesem Handy nicht verfügbar oder muss aktualisiert werden (Play Store → „Health Connect“).'
              : 'Health-Daten sind auf diesem Gerät nicht verfügbar.'}
          </Txt>
        ) : null}
      </Card>

      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <SwitchRow title={`Mit ${healthName} verbinden`} subtitle="Lesen: Schritte, Schlaf, Gewicht · Schreiben: Gewicht, Trainings" value={state.settings.healthSync} onChange={(v) => void enable(v)} icon="link-variant" testID="health-toggle" />
      </Card>

      {state.settings.healthSync ? (
        <>
          <Button title="Jetzt synchronisieren" icon="sync" onPress={() => void sync()} loading={busy} />
          <Txt variant="caption" center>
            {state.healthSyncedAt ? `Zuletzt: ${new Date(state.healthSyncedAt).toLocaleString('de-DE')}` : 'Noch nicht synchronisiert'} · Synchronisiert automatisch beim Öffnen der App.
          </Txt>
        </>
      ) : null}
      <Button title={`${healthName}-Berechtigungen öffnen`} icon="cog-outline" variant="ghost" onPress={openHealthSettings} />
      <Txt variant="caption">
        Tipp: Hast du eine Berechtigung abgelehnt, kannst du sie in {Platform.OS === 'ios' ? 'der Health-App unter „Teilen → Apps → FitLife“' : 'den Health-Connect-Einstellungen'} wieder erlauben.
      </Txt>
    </Screen>
  );
}

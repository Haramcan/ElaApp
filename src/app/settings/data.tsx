import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Share } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Input, Screen, Txt } from '../../components/ui';
import { formatNumber, nutrientsFor } from '../../lib/calc';
import { cancelAll } from '../../lib/notifications';
import { confirm, notify } from '../../lib/platform';
import { mealLabel } from '../../lib/selectors';
import { useStore } from '../../lib/store';

function download(filename: string, content: string, mime: string) {
  const g = globalThis as any;
  if (!g.document || !g.Blob || !g.URL) return false;
  const blob = new g.Blob([content], { type: mime });
  const url = g.URL.createObjectURL(blob);
  const a = g.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => g.URL.revokeObjectURL(url), 1000);
  return true;
}

export default function DataSettings() {
  const { state, actions } = useStore();
  const toast = useToast();
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const exportJson = async () => {
    const json = JSON.stringify({ app: 'FitLife', exportedAt: new Date().toISOString(), data: state });
    if (Platform.OS === 'web') {
      download(`fitlife-backup-${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
      toast('Backup heruntergeladen');
      return;
    }
    try {
      await Share.share({ title: 'FitLife Backup', message: json });
    } catch {
      notify('Fehler', 'Das Backup konnte nicht geteilt werden.');
    }
  };

  const exportCsv = async () => {
    const rows = [['Datum', 'Mahlzeit', 'Lebensmittel', 'Marke', 'Menge', 'Einheit', 'kcal', 'Eiweiß (g)', 'Kohlenhydrate (g)', 'Fett (g)'].join(';')];
    const sorted = [...state.foodLog].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
    for (const e of sorted) {
      const n = nutrientsFor(e.food, e.amount);
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      rows.push(
        [
          e.date,
          mealLabel(e.meal),
          esc(e.food.name),
          esc(e.food.brand ?? ''),
          formatNumber(e.amount, 1),
          e.food.unit,
          formatNumber(n.kcal, 0),
          formatNumber(n.protein, 1),
          formatNumber(n.carbs, 1),
          formatNumber(n.fat, 1),
        ].join(';'),
      );
    }
    const csv = rows.join('\n');
    if (Platform.OS === 'web') {
      download('fitlife-ernaehrung.csv', '﻿' + csv, 'text/csv');
      toast('CSV heruntergeladen');
      return;
    }
    try {
      await Share.share({ title: 'FitLife Ernährungstagebuch', message: csv });
    } catch {
      notify('Fehler', 'Der Export konnte nicht geteilt werden.');
    }
  };

  const doImport = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(importText.trim());
    } catch {
      notify('Ungültige Daten', 'Der eingefügte Text ist kein gültiges FitLife-Backup.');
      return;
    }
    const data = parsed?.data ?? parsed;
    if (!data || typeof data !== 'object' || !('profile' in data) || !('foodLog' in data)) {
      notify('Ungültige Daten', 'Das Backup enthält keine FitLife-Daten.');
      return;
    }
    const ok = await confirm('Backup wiederherstellen?', 'Alle aktuellen Daten werden durch das Backup ersetzt.', 'Wiederherstellen', true);
    if (!ok) return;
    actions.importData(data);
    setImportText('');
    setShowImport(false);
    toast({ message: 'Backup wiederhergestellt', icon: 'check' });
  };

  const reset = async () => {
    const ok = await confirm('Alle Daten löschen?', 'Profil, Tagebuch, Gewicht, Trainings und Einstellungen werden unwiderruflich gelöscht.', 'Alles löschen', true);
    if (!ok) return;
    await cancelAll();
    actions.resetAll();
    router.replace('/onboarding');
  };

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 10 }}>
        <Txt variant="h3">Übersicht</Txt>
        <Txt variant="small">
          {state.foodLog.length} Mahlzeiten-Einträge · {state.workouts.length} Aktivitäten · {state.weights.length} Gewichtseinträge · {state.customFoods.length} eigene
          Lebensmittel
        </Txt>
        <Txt variant="caption">Alle Daten werden ausschließlich lokal auf deinem Gerät gespeichert. Es gibt kein Konto und keine Cloud.</Txt>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">Backup</Txt>
        <Txt variant="small">Sichere deine Daten regelmäßig, z. B. vor einem Handywechsel.</Txt>
        <Button title="Backup exportieren (JSON)" icon="export" onPress={() => void exportJson()} testID="data-export" />
        <Button title="Ernährungstagebuch als CSV" icon="file-delimited-outline" variant="secondary" onPress={() => void exportCsv()} />
        {showImport ? (
          <>
            <Input label="Backup-Text einfügen" value={importText} onChangeText={setImportText} multiline numberOfLines={5} placeholder='{"app":"FitLife", ...}' autoCorrect={false} autoCapitalize="none" testID="data-import-text" />
            <Button title="Wiederherstellen" icon="import" onPress={() => void doImport()} disabled={importText.trim().length < 10} testID="data-import" />
          </>
        ) : (
          <Button title="Backup importieren" icon="import" variant="secondary" onPress={() => setShowImport(true)} />
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">Zurücksetzen</Txt>
        <Button title="Alle Daten löschen" icon="delete-forever" variant="danger" onPress={() => void reset()} testID="data-reset" />
      </Card>
    </Screen>
  );
}

import Constants from 'expo-constants';
import React from 'react';
import { Linking, View } from 'react-native';

import { Card, Icon, ListItem, Screen, Txt } from '../../components/ui';
import { useTheme } from '../../lib/theme';

const FAQ: [string, string][] = [
  ['Wie wird mein Kalorienziel berechnet?', 'Mit der Mifflin-St-Jeor-Formel (Grundumsatz) × Aktivitätsfaktor. Zum Abnehmen wird pro 0,5 kg/Woche ein Defizit von ca. 550 kcal/Tag abgezogen. Für die Gesundheit setzen wir nie unter 1.200 (Frauen) bzw. 1.500 kcal (Männer).'],
  ['Woher kommen die Produktdaten?', 'Aus Open Food Facts – einer freien, von der Community gepflegten Lebensmitteldatenbank. Fehlt ein Produkt, kannst du es selbst anlegen; beim nächsten Scan wird es erkannt.'],
  ['Warum kommen manche Erinnerungen nicht?', 'Smarte Erinnerungen entfallen, wenn das Ziel bereits erreicht ist. Außerdem werden Erinnerungen für die nächsten Tage geplant – öffne die App mindestens alle paar Tage. Prüfe auch, ob Benachrichtigungen in den Systemeinstellungen erlaubt sind.'],
  ['Wie werden verbrannte Kalorien geschätzt?', 'Über MET-Werte (metabolisches Äquivalent) × Körpergewicht × Dauer. Das ist eine Schätzung – du kannst den Wert beim Eintragen anpassen.'],
  ['Wie zähle ich Liegestütze?', 'Öffne die Challenge und tippe pro Wiederholung auf den großen Kreis. Profi-Tipp: Handy unter das Gesicht legen und mit der Nase antippen.'],
  ['Sind meine Daten sicher?', 'Alle Daten bleiben lokal auf deinem Gerät. Nur Barcode- und Suchanfragen werden an Open Food Facts gesendet.'],
];

export default function About() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <Screen edges={['bottom']}>
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart-pulse" size={40} color={colors.primary} />
        </View>
        <Txt variant="h1">FitLife</Txt>
        <Txt variant="small">Version {version}</Txt>
      </Card>
      <Txt variant="label">Häufige Fragen</Txt>
      {FAQ.map(([q, a]) => (
        <Card key={q} style={{ gap: 6 }}>
          <Txt bold>{q}</Txt>
          <Txt variant="small">{a}</Txt>
        </Card>
      ))}
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <ListItem title="Open Food Facts" subtitle="Lebensmitteldaten unter ODbL-Lizenz" icon="open-in-new" chevron onPress={() => void Linking.openURL('https://world.openfoodfacts.org')} />
      </Card>
      <Txt variant="caption">
        Hinweis: Diese App ersetzt keine ärztliche oder ernährungswissenschaftliche Beratung. Bei Vorerkrankungen, Schwangerschaft oder Essstörungen sprich bitte vor einer
        Ernährungsumstellung mit einer Fachperson.
      </Txt>
    </Screen>
  );
}

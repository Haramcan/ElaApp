# FitLife – Fitness- & Kalorien-App

Eine vollständige Fitness-App für **iOS und Android** (Expo / React Native, TypeScript). Alle Daten bleiben lokal auf dem Gerät – kein Konto, keine Cloud.

## Funktionen

**Ernährung**
- Kalorien- & Makro-Tracker (Eiweiß, Kohlenhydrate, Fett, Zucker, Ballaststoffe, Salz) mit Tagebuch pro Mahlzeit
- **Barcode-Scanner** (EAN-8/13, UPC) mit Kamera + Taschenlampe, Produktdaten aus Open Food Facts inkl. Nutri-Score
- Unbekannter Barcode → Produkt selbst anlegen; wird beim nächsten Scan automatisch erkannt
- Online-Suche (Open Food Facts) + Offline-Datenbank mit ~90 Basis-Lebensmitteln
- Favoriten, zuletzt verwendet, eigene Lebensmittel, Portionen oder Gramm, Schnell-Eintrag nur mit Kalorien
- Mahlzeit von gestern übernehmen, Einträge bearbeiten/verschieben/löschen mit „Rückgängig“

**Training & Challenges**
- **Tages-Challenges** (z. B. 10 Liegestütze, 20 Kniebeugen, 30 s Plank) mit Tipp-Zähler und Timer, frei konfigurierbar
- 40 Übungen/Sportarten mit Kalorienschätzung über MET-Werte
- 7 geführte Workouts (u. a. 7-Minuten-Workout, HIIT, Bauch, Beine) mit Intervall-Timer, Pause/Skip, Haptik, Bildschirm bleibt an
- Trainingskalorien optional dem Tagesbudget gutschreiben (einstellbarer Prozentsatz)

**Krafttraining im Fitnessstudio**
- Geräte-Bibliothek mit ~60 typischen Studio-Geräten und Übungen (Beinpresse, Latzug, Brustpresse, Butterfly, Abduktoren …) + eigene Geräte anlegen
- Pro Satz Gewicht (kg/lb) und Wiederholungen eintragen und abhaken, automatischer Pausen-Timer
- **„Letztes Mal“** direkt am Gerät (z. B. „15 kg × 12, 12, 12“) und **Steigerungs-Empfehlung** („heute 17,5 kg probieren“), Felder werden vorausgefüllt
- Geräte-Einstellungen merken (Sitzhöhe, Lehne), Verlauf & Diagramm pro Gerät, Bestwert, geschätztes 1RM, Rekord-Erkennung
- **Trainingspläne**: selbst anlegen (Tage, Übungen, Sätze, Wdh.-Bereich, Pause) oder **erstellen lassen** (Ziel, Tage/Woche, Erfahrung, Geräte/Freihantel, Schwerpunkt); der nächste Trainingstag wird automatisch vorgeschlagen

**Ernährung+, Gesundheit & Motivation**
- Rezepte & Mahlzeit-Vorlagen, „Was kann ich noch essen?“-Vorschläge passend zum Restbudget
- Kalorien per Foto (KI, Claude) mit editierbarer Schätzung
- Muskel-Übersicht (Körperkarte, Erholung, Empfehlung), Trainingspläne teilen & importieren (auch „für jemand anderen erstellen“)
- Wochenrückblick (jeden Sonntag als Benachrichtigung), Fortschrittsfotos, Schlaf & Stimmung
- Apple Health / Health Connect (Schritte, Schlaf, Gewicht lesen; Gewicht & Trainings schreiben)
- Homescreen-Widgets (anpassbar), Live Activity in der Dynamic Island, Android-Live-Benachrichtigung

**Erinnerungen (lokale Push-Benachrichtigungen)**
- Wasser (Intervall), Frühstück/Mittag/Abendessen, Tages-Challenge, Training, Wiegen, Tagesziel-Check, Fastenende, eigene Erinnerungen
- Feste Uhrzeiten oder Intervalle, Wochentage frei wählbar
- **Smart**: entfällt automatisch, wenn das Ziel schon erreicht ist, und nennt, was noch fehlt („Noch offen: 10× Liegestütze“)

**Weiteres**
- Onboarding mit persönlicher Berechnung (Mifflin-St-Jeor, Aktivitätsfaktor, Abnehm-/Zunehm-Tempo, Mindestkalorien)
- Wasser-Tracker, Schrittzähler (Gerätesensor + manuell), Intervallfasten (12:12 bis 24 h)
- Gewicht, Körperfett & Taille mit Verlaufsdiagramm, BMI, Zielfortschritt
- Diagramme für Kalorien, Wasser, Schritte; Tagesverlauf; Serien (Streaks); 16 Erfolge
- Einstellungen: Hell/Dunkel/System, kcal/kJ, kg/lb, Wochenbeginn, Glas-/Flaschengröße, Haptik, Workout-Intervalle
- Backup als JSON exportieren/importieren, Tagebuch als CSV, alles zurücksetzen

## Als App installieren (Download-Link)

Siehe **[APP-INSTALLIEREN.md](APP-INSTALLIEREN.md)** – Android-APK per Link, iPhone per Ad-hoc-Link, Updates ohne Neuinstallation.

## Entwicklung auf dem Handy starten

```bash
npm install
npx expo start
```

Dann den QR-Code mit der **Expo Go** App (iOS/Android, Expo SDK 58) scannen.
Für eine installierbare App: `npx eas-cli@latest build --profile preview` (siehe Expo-Doku zu EAS Build).

## Entwicklung

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Unit-Tests (Jest)
npm run web         # Web-Vorschau im Browser (ohne Kamera-Scan/Push)
```

### Struktur

```
src/app/            Screens (Expo Router)
  (tabs)/           Heute, Ernährung, Training, Fortschritt, Mehr
  food/             Suche, Portion, eigenes Lebensmittel, Schnell-Eintrag
  workout/          Aktivität eintragen, Workout-Details, Workout-Timer
  gym/              Krafttraining: Übersicht, laufendes Training, Geräte, Verlauf, Pläne, Generator
  settings/         Profil, Ziele, Erinnerungen, Challenges, App, Daten, Info
src/components/     UI-Bausteine, Diagramme, Toasts, Hintergrund-Effekte
src/lib/            Datenmodell, Store, Berechnungen, Open-Food-Facts-Client,
                    Erinnerungsplanung, Erfolge, Übungen, Lebensmittel
src/__tests__/      Unit-Tests
```

Hinweis: Die App ersetzt keine ärztliche Beratung.

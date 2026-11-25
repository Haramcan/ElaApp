# FitLife aufs Handy bringen (ohne App Store)

Die App wird in der Cloud von **Expo (EAS Build)** gebaut. Danach bekommst du einen **Download-Link**.
Nur wer den Link hat, kann die App installieren. Die App läuft danach komplett auf dem Handy, **ohne dass dein PC an ist**.
Spätere Änderungen kommen per Update automatisch aufs Handy, ohne Neuinstallation.

Du brauchst einmalig: einen Computer mit [Node.js](https://nodejs.org) (Version 20 oder neuer) und ein kostenloses Konto auf [expo.dev](https://expo.dev/signup).

---

## 1. Einmalig einrichten (5 Minuten)

```bash
git clone https://github.com/Haramcan/ElaApp.git
cd ElaApp
git checkout claude/gracious-babbage-2mq8sy
npm install
npx eas-cli@latest login            # mit deinem Expo-Konto anmelden
npx eas-cli@latest init             # verknüpft das Projekt mit deinem Konto
npx eas-cli@latest update:configure # aktiviert automatische Updates
```

---

## 2. Android (Handy deiner Freundin) – kostenlos

```bash
npm run build:android
```

- Dauert ca. 10–20 Minuten. Am Ende steht im Terminal ein **Link** und ein **QR-Code**. Der Link ist auch auf expo.dev unter *Builds* zu finden.
- Den Link am Android-Handy öffnen → **Installieren** antippen.
- Android fragt einmal, ob Apps aus dieser Quelle installiert werden dürfen → erlauben.
- Fertig. Die App heißt **FitLife** und hat ein grünes Herz-Icon.

---

## 3. iPhone (dein Handy)

Apple erlaubt die Installation per Link nur mit einem **Apple-Entwicklerkonto** (99 $/Jahr, [developer.apple.com/programs](https://developer.apple.com/programs/)). Einen anderen Weg ohne App Store gibt es bei Apple nicht.

1. Apple-Entwicklerkonto anlegen (Freischaltung dauert meist 1–2 Tage).
2. Dein iPhone registrieren:
   ```bash
   npx eas-cli@latest device:create
   ```
   Es erscheint ein Link/QR-Code → am iPhone öffnen → Profil installieren (Einstellungen → „Profil geladen“ → Installieren).
3. App bauen:
   ```bash
   npm run build:ios
   ```
   Beim ersten Mal fragt das Tool nach deinem Apple-Login und richtet Zertifikate automatisch ein.
4. Den Link am iPhone öffnen → **Installieren**.
5. Einmalig unter *Einstellungen → Datenschutz & Sicherheit → Entwicklermodus* einschalten (iPhone startet neu).

> Neue iPhones (z. B. ein Freund) müssen vorher mit `device:create` registriert werden, danach `npm run build:ios` erneut.

---

## 4. Updates verteilen

Wenn sich nur der App-Code ändert (das ist fast immer der Fall):

```bash
npm run update
```

Die Handys laden das Update beim nächsten Öffnen automatisch (spätestens beim zweiten Start aktiv).
Nur bei neuen nativen Funktionen (neue Berechtigungen, neue Bibliotheken) ist ein neuer Build mit Schritt 2/3 nötig.

---

## Nach der Installation einrichten

- **Erinnerungen**: beim ersten Start erlauben.
- **Apple Health / Health Connect**: *Mehr → Apple Health / Health Connect* → einschalten.
  Android: Falls nötig, „Health Connect“ aus dem Play Store installieren/aktualisieren.
- **Widgets**: Homescreen lange drücken → Widgets → „FitLife“. Was angezeigt wird: *Mehr → Widgets & Live-Anzeige*
  (iPhone: zusätzlich pro Widget per „Widget bearbeiten“).
- **Dynamic Island / Live-Benachrichtigung**: *Mehr → Widgets & Live-Anzeige → Live-Anzeige* einschalten.
- **Kalorien per Foto (KI)**: *Mehr → KI-Foto-Erkennung* → eigenen Claude-API-Schlüssel von console.anthropic.com eintragen
  (kostet grob 1–3 Cent pro Foto).

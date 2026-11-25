import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Input, Row, Screen, Txt } from '../../components/ui';
import { AI_MODEL, getApiKey, looksLikeKey, setApiKey, testApiKey } from '../../lib/ai';
import { confirm } from '../../lib/platform';
import { useTheme } from '../../lib/theme';

export default function AiSettings() {
  const { colors } = useTheme();
  const toast = useToast();
  const [stored, setStored] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void getApiKey().then(setStored);
  }, []);

  const save = async () => {
    const key = draft.trim();
    setBusy(true);
    setMsg(null);
    const ok = await testApiKey(key);
    if (ok) {
      await setApiKey(key);
      setStored(key);
      setDraft('');
      toast({ message: 'Schlüssel gespeichert', icon: 'check' });
      setMsg({ ok: true, text: 'Der Schlüssel funktioniert.' });
    } else {
      setMsg({ ok: false, text: 'Der Schlüssel funktioniert nicht. Bitte prüfen (und Internetverbindung).' });
    }
    setBusy(false);
  };

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 8 }}>
        <Txt variant="h3">Kalorien per Foto (KI)</Txt>
        <Txt variant="small">
          Für die Foto-Erkennung nutzt die App Claude von Anthropic ({AI_MODEL}). Du brauchst dafür einen eigenen API-Schlüssel – so zahlst du nur, was du nutzt (grob 1–3 Cent
          pro Foto), und es gibt keinen Server dazwischen.
        </Txt>
        <Txt variant="small">1. Auf console.anthropic.com anmelden und Guthaben aufladen.</Txt>
        <Txt variant="small">2. Unter „API Keys“ einen Schlüssel erstellen und hier einfügen.</Txt>
        <Button small variant="secondary" title="console.anthropic.com öffnen" icon="open-in-new" onPress={() => void Linking.openURL('https://console.anthropic.com/settings/keys')} />
      </Card>

      <Card style={{ gap: 10 }}>
        {stored ? (
          <Row justify="space-between">
            <Txt>Gespeichert: sk-ant-…{stored.slice(-4)}</Txt>
            <Button
              small
              variant="danger"
              title="Löschen"
              full={false}
              onPress={async () => {
                if (await confirm('Schlüssel löschen?', 'Die Foto-Erkennung funktioniert danach erst wieder mit neuem Schlüssel.', 'Löschen', true)) {
                  await setApiKey(null);
                  setStored(null);
                }
              }}
            />
          </Row>
        ) : null}
        <Input
          label={stored ? 'Neuen Schlüssel einfügen' : 'API-Schlüssel'}
          value={draft}
          onChangeText={setDraft}
          placeholder="sk-ant-…"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          testID="ai-key-input"
          error={draft.length > 0 && !looksLikeKey(draft) ? 'Ein Schlüssel beginnt mit „sk-ant-“' : undefined}
        />
        <Button title="Prüfen & speichern" icon="key" onPress={() => void save()} loading={busy} disabled={!looksLikeKey(draft)} testID="ai-key-save" />
        {msg ? (
          <Txt variant="small" color={msg.ok ? colors.success : colors.danger}>
            {msg.text}
          </Txt>
        ) : null}
        <Txt variant="caption">Der Schlüssel wird verschlüsselt im Schlüsselbund deines Handys gespeichert und nie mit Backups exportiert.</Txt>
      </Card>
    </Screen>
  );
}

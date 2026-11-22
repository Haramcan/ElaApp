import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { ProgressRing } from '../components/charts';
import { useToast } from '../components/Toast';
import { Button, Card, Chip, Divider, IconButton, ListItem, Row, Screen, SectionHeader, Txt } from '../components/ui';
import { formatDuration } from '../lib/date';
import { useNow } from '../lib/hooks';
import { confirm, useHaptics } from '../lib/platform';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

const PRESETS = [
  { h: 12, label: '12:12', desc: 'Einsteiger' },
  { h: 14, label: '14:10', desc: 'Leicht' },
  { h: 16, label: '16:8', desc: 'Klassiker' },
  { h: 18, label: '18:6', desc: 'Fortgeschritten' },
  { h: 20, label: '20:4', desc: 'Warrior' },
  { h: 24, label: '24 h', desc: 'Ganzer Tag' },
];

function phaseText(hours: number): string {
  if (hours < 4) return 'Verdauung: Dein Körper verarbeitet die letzte Mahlzeit.';
  if (hours < 12) return 'Blutzucker sinkt, der Körper nutzt gespeicherte Energie.';
  if (hours < 16) return 'Fettverbrennung läuft an – Glykogenspeicher leeren sich.';
  if (hours < 24) return 'Ketose beginnt: Fett wird zur Hauptenergiequelle.';
  return 'Lange Fastenphase – achte auf genug Flüssigkeit und Elektrolyte.';
}

const fmtTime = (ts: number) => new Date(ts).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export default function Fasting() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const f = state.fasting;
  const active = f.active;
  const now = useNow(1000, !!active);
  const elapsed = active ? now - active.start : 0;
  const target = (active?.targetHours ?? f.targetHours) * 3600000;
  const reached = active ? elapsed >= target : false;
  const reminder = state.reminders.find((r) => r.type === 'fasting');

  const end = async () => {
    if (!active) return;
    if (!reached) {
      const ok = await confirm('Fasten beenden?', `Du hast dein Ziel von ${active.targetHours} h noch nicht erreicht. Trotzdem beenden?`, 'Beenden', true);
      if (!ok) return;
    }
    actions.endFast();
    haptics.success();
    toast({ message: reached ? 'Super, Fastenziel erreicht! 🎉' : 'Fasten beendet', icon: 'timer-sand-complete' });
  };

  return (
    <Screen edges={['bottom']}>
      <Card style={{ alignItems: 'center', gap: 12 }}>
        <ProgressRing size={220} stroke={16} progress={active ? elapsed / target : 0} color={reached ? colors.success : colors.primary}>
          {active ? (
            <>
              <Txt variant="caption">{reached ? 'Ziel erreicht!' : 'Gefastet'}</Txt>
              <Txt variant="number" testID="fasting-elapsed">
                {formatDuration(elapsed)}
              </Txt>
              <Txt variant="caption">{reached ? `+${formatDuration(elapsed - target)}` : `noch ${formatDuration(target - elapsed)}`}</Txt>
            </>
          ) : (
            <>
              <Txt variant="caption">Bereit</Txt>
              <Txt variant="number">{f.targetHours} h</Txt>
              <Txt variant="caption">Fastenziel</Txt>
            </>
          )}
        </ProgressRing>
        {active ? (
          <>
            <Txt variant="small" center>
              {phaseText(elapsed / 3600000)}
            </Txt>
            <Row gap={16}>
              <View style={{ alignItems: 'center' }}>
                <Txt variant="caption">Start</Txt>
                <Txt bold>{fmtTime(active.start)}</Txt>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Txt variant="caption">Ende</Txt>
                <Txt bold>{fmtTime(active.start + target)}</Txt>
              </View>
            </Row>
            <Row gap={8}>
              <Button small title="Start −30 min" variant="secondary" full={false} onPress={() => actions.updateActiveFast({ start: active.start - 30 * 60000 })} />
              <Button
                small
                title="Start +30 min"
                variant="secondary"
                full={false}
                disabled={active.start + 30 * 60000 > now}
                onPress={() => actions.updateActiveFast({ start: active.start + 30 * 60000 })}
              />
            </Row>
            <Button title={reached ? 'Fasten beenden 🎉' : 'Fasten beenden'} icon="stop" variant={reached ? 'primary' : 'danger'} onPress={() => void end()} testID="fasting-end" />
            <Button small title="Abbrechen (nicht speichern)" variant="ghost" onPress={() => actions.cancelFast()} />
          </>
        ) : (
          <Button
            title="Fasten starten"
            icon="play"
            testID="fasting-start"
            onPress={() => {
              actions.startFast(f.targetHours);
              haptics.medium();
              toast({ message: `Fasten gestartet – Ziel ${f.targetHours} h`, icon: 'timer-sand' });
            }}
          />
        )}
      </Card>

      <SectionHeader title="Fastenplan" />
      <Row wrap gap={8}>
        {PRESETS.map((p) => {
          const sel = (active?.targetHours ?? f.targetHours) === p.h;
          return (
            <Chip
              key={p.h}
              label={`${p.label} · ${p.desc}`}
              selected={sel}
              onPress={() => {
                actions.setFastTarget(p.h);
                if (active) actions.updateActiveFast({ targetHours: p.h });
              }}
            />
          );
        })}
      </Row>

      {reminder ? (
        <Card>
          <ListItem
            icon="bell-outline"
            title="Benachrichtigung bei Fastenende"
            subtitle={reminder.enabled ? 'Aktiv – du wirst benachrichtigt, sobald dein Ziel erreicht ist.' : 'Aus'}
            onPress={() => actions.updateReminder(reminder.id, { enabled: !reminder.enabled })}
            right={<Txt bold color={reminder.enabled ? colors.success : colors.muted}>{reminder.enabled ? 'An' : 'Aus'}</Txt>}
          />
        </Card>
      ) : null}

      <SectionHeader title="Verlauf" />
      {f.history.length === 0 ? (
        <Txt variant="small">Noch keine abgeschlossenen Fastenperioden.</Txt>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          {f.history.slice(0, 30).map((h, i) => {
            const dur = (h.end ?? h.start) - h.start;
            const ok = dur >= h.targetHours * 3600000;
            return (
              <React.Fragment key={h.id}>
                {i > 0 ? <Divider /> : null}
                <ListItem
                  icon={ok ? 'check-circle' : 'close-circle-outline'}
                  iconColor={ok ? colors.success : colors.muted}
                  title={`${formatDuration(dur)} von ${h.targetHours} h`}
                  subtitle={`${fmtTime(h.start)} – ${fmtTime(h.end ?? h.start)}`}
                  right={<IconButton icon="delete-outline" size={18} color={colors.muted} label="Löschen" onPress={() => actions.removeFast(h.id)} />}
                />
              </React.Fragment>
            );
          })}
        </Card>
      )}
      <Txt variant="caption">
        Intervallfasten ist nicht für jeden geeignet (z. B. in Schwangerschaft, bei Diabetes oder Essstörungen). Im Zweifel ärztlich beraten lassen.
      </Txt>
      <Button title="Zurück zur Übersicht" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Chip, IconButton, Input, Row, Screen, Segmented, Stepper, SwitchRow, TimeField, Txt } from '../../components/ui';
import { ISO_WEEKDAY_SHORT } from '../../lib/date';
import { confirm } from '../../lib/platform';
import { reminderTimes } from '../../lib/reminderPlan';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { Reminder, ReminderTime } from '../../lib/types';
import { describeSchedule } from '../../lib/reminderLabels';

const SMART_TEXT: Partial<Record<Reminder['type'], string>> = {
  water: 'Entfällt, wenn dein Wasserziel erreicht ist, und zeigt, wie viel noch fehlt.',
  meal: 'Entfällt, wenn du die Mahlzeit schon eingetragen hast.',
  challenge: 'Entfällt, wenn alle Challenges erledigt sind, und nennt die offenen.',
  workout: 'Entfällt, wenn du heute schon trainiert hast.',
  weight: 'Entfällt, wenn du dich heute schon gewogen hast.',
  goalcheck: 'Zeigt dir, welche Tagesziele noch offen sind.',
};

export default function ReminderEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const existing = id ? state.reminders.find((r) => r.id === id) : undefined;
  const isNew = !existing;

  const [r, setR] = useState<Reminder>(
    existing ?? {
      id: '',
      type: 'custom',
      title: 'Meine Erinnerung',
      body: 'Zeit für eine kurze Bewegungspause! 🧘',
      enabled: true,
      mode: 'times',
      times: [{ hour: 15, minute: 0 }],
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      intervalMin: 60,
      startTime: { hour: 9, minute: 0 },
      endTime: { hour: 18, minute: 0 },
      smart: false,
    },
  );
  const set = (patch: Partial<Reminder>) => setR((prev) => ({ ...prev, ...patch }));
  const isFasting = r.type === 'fasting';
  const startMin = r.startTime.hour * 60 + r.startTime.minute;
  const endMin = r.endTime.hour * 60 + r.endTime.minute;
  const valid =
    r.title.trim().length > 0 &&
    (isFasting || r.weekdays.length > 0) &&
    (isFasting || (r.mode === 'times' ? r.times.length > 0 : endMin > startMin));
  const perDay = isFasting ? 0 : reminderTimes(r).length;

  const save = () => {
    if (!valid) return;
    const clean = { ...r, title: r.title.trim(), body: r.body.trim() };
    if (isNew) {
      const { id: _ignored, ...rest } = clean;
      actions.addReminder(rest);
    } else {
      actions.updateReminder(r.id, clean);
    }
    toast({ message: 'Erinnerung gespeichert', icon: 'bell-check' });
    router.back();
  };

  const updateTime = (i: number, t: ReminderTime) => set({ times: r.times.map((x, j) => (j === i ? t : x)) });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: isNew ? 'Neue Erinnerung' : 'Erinnerung bearbeiten' }} />
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          <SwitchRow title="Aktiv" value={r.enabled} onChange={(v) => set({ enabled: v })} icon="bell" />
        </Card>

        <Card style={{ gap: 12 }}>
          <Input label="Titel" value={r.title} onChangeText={(t) => set({ title: t })} maxLength={60} testID="rem-title" />
          <Input label="Text" value={r.body} onChangeText={(t) => set({ body: t })} maxLength={160} multiline />
        </Card>

        {!isFasting ? (
          <>
            <Card style={{ gap: 12 }}>
              <Txt variant="h3">Zeitplan</Txt>
              <Segmented
                options={[
                  { value: 'times', label: 'Feste Uhrzeiten' },
                  { value: 'interval', label: 'Intervall' },
                ]}
                value={r.mode}
                onChange={(m) => set({ mode: m })}
                testIDPrefix="rem-mode"
              />
              {r.mode === 'times' ? (
                <>
                  {r.times.map((t, i) => (
                    <Row key={i} justify="space-between">
                      <TimeField hour={t.hour} minute={t.minute} onChange={(h, m) => updateTime(i, { hour: h, minute: m })} testID={`rem-time-${i}`} />
                      <IconButton icon="delete-outline" label="Uhrzeit entfernen" color={colors.danger} onPress={() => set({ times: r.times.filter((_, j) => j !== i) })} disabled={r.times.length <= 1} />
                    </Row>
                  ))}
                  {r.times.length < 12 ? (
                    <Button
                      small
                      variant="soft"
                      title="Uhrzeit hinzufügen"
                      icon="plus"
                      testID="rem-add-time"
                      onPress={() => {
                        const last = r.times[r.times.length - 1] ?? { hour: 8, minute: 0 };
                        set({ times: [...r.times, { hour: (last.hour + 2) % 24, minute: last.minute }] });
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <Row justify="space-between">
                    <Txt>Alle</Txt>
                    <Stepper
                      value={r.intervalMin}
                      onChange={(v) => set({ intervalMin: v })}
                      step={15}
                      min={30}
                      max={360}
                      format={(v) => (v % 60 === 0 ? `${v / 60} h` : `${Math.floor(v / 60) ? `${Math.floor(v / 60)} h ` : ''}${v % 60} min`)}
                      label="Intervall"
                      testID="rem-interval"
                    />
                  </Row>
                  <Row justify="space-between">
                    <Txt>Von</Txt>
                    <TimeField hour={r.startTime.hour} minute={r.startTime.minute} onChange={(h, m) => set({ startTime: { hour: h, minute: m } })} />
                  </Row>
                  <Row justify="space-between">
                    <Txt>Bis</Txt>
                    <TimeField hour={r.endTime.hour} minute={r.endTime.minute} onChange={(h, m) => set({ endTime: { hour: h, minute: m } })} />
                  </Row>
                  {endMin <= startMin ? (
                    <Txt variant="caption" color={colors.danger}>
                      Die Endzeit muss nach der Startzeit liegen.
                    </Txt>
                  ) : null}
                </>
              )}
              <Txt variant="small" bold>
                Wochentage
              </Txt>
              <Row gap={6} wrap>
                {ISO_WEEKDAY_SHORT.map((label, i) => {
                  const d = i + 1;
                  const sel = r.weekdays.includes(d);
                  return (
                    <Chip
                      key={d}
                      label={label}
                      selected={sel}
                      onPress={() => set({ weekdays: sel ? r.weekdays.filter((x) => x !== d) : [...r.weekdays, d].sort() })}
                    />
                  );
                })}
              </Row>
              <Row gap={6}>
                <Button small variant="secondary" full={false} title="Täglich" onPress={() => set({ weekdays: [1, 2, 3, 4, 5, 6, 7] })} />
                <Button small variant="secondary" full={false} title="Werktags" onPress={() => set({ weekdays: [1, 2, 3, 4, 5] })} />
                <Button small variant="secondary" full={false} title="Wochenende" onPress={() => set({ weekdays: [6, 7] })} />
              </Row>
              {r.weekdays.length === 0 ? (
                <Txt variant="caption" color={colors.danger}>
                  Bitte mindestens einen Tag wählen.
                </Txt>
              ) : null}
              <Txt variant="caption">
                {describeSchedule(r)} · {perDay}× pro Tag
              </Txt>
            </Card>

            {SMART_TEXT[r.type] ? (
              <Card padded={false} style={{ paddingHorizontal: 14 }}>
                <SwitchRow title="Smarte Erinnerung" subtitle={SMART_TEXT[r.type]} value={r.smart} onChange={(v) => set({ smart: v })} icon="brain" />
              </Card>
            ) : null}
          </>
        ) : (
          <Txt variant="small">Diese Erinnerung kommt automatisch, sobald dein aktives Fasten das Ziel erreicht.</Txt>
        )}

        <Button title="Speichern" icon="content-save" onPress={save} disabled={!valid} testID="rem-save" />
        {!isNew && existing?.type === 'custom' ? (
          <Button
            title="Löschen"
            icon="delete"
            variant="danger"
            onPress={async () => {
              if (await confirm('Erinnerung löschen?', `„${existing.title}“ wird entfernt.`, 'Löschen', true)) {
                actions.removeReminder(existing.id);
                toast('Erinnerung gelöscht');
                router.back();
              }
            }}
          />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, Switch, View } from 'react-native';

import { useToast } from '../../components/Toast';
import { Button, Card, Divider, Icon, ListItem, Row, Screen, Txt } from '../../components/ui';
import {
  getPermissionState,
  notificationsSupported,
  requestPermission,
  scheduledCount,
  sendTestNotification,
  syncNotifications,
  type PermissionState,
} from '../../lib/notifications';
import { describeSchedule, REMINDER_ICONS } from '../../lib/reminderLabels';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function RemindersScreen() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    void getPermissionState().then(setPerm);
    void scheduledCount().then(setCount);
  }, []);

  useFocusEffect(refresh);

  const anyOn = state.reminders.some((r) => r.enabled);

  return (
    <Screen edges={['bottom']}>
      {!notificationsSupported ? (
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Txt variant="small">Erinnerungen funktionieren in der iOS- und Android-App. In der Web-Vorschau werden sie nicht angezeigt.</Txt>
        </Card>
      ) : perm !== 'granted' ? (
        <Card style={{ gap: 10, backgroundColor: colors.warningSoft }}>
          <Row gap={8}>
            <Icon name="bell-off-outline" color={colors.warning} />
            <Txt variant="h3" style={{ flex: 1 }}>
              Benachrichtigungen sind aus
            </Txt>
          </Row>
          <Txt variant="small">Erlaube Benachrichtigungen, damit dich die App an Wasser, Mahlzeiten und Challenges erinnern kann.</Txt>
          {perm === 'denied' ? (
            <Button title="Systemeinstellungen öffnen" icon="cog" onPress={() => void Linking.openSettings()} />
          ) : (
            <Button
              title="Benachrichtigungen erlauben"
              icon="bell-ring"
              testID="rem-allow"
              onPress={async () => {
                const p = await requestPermission();
                setPerm(p);
                if (p === 'granted') {
                  await syncNotifications(state, true);
                  refresh();
                }
              }}
            />
          )}
        </Card>
      ) : (
        <Card>
          <Row gap={8}>
            <Icon name="bell-check" color={colors.success} />
            <Txt variant="small" style={{ flex: 1 }}>
              Benachrichtigungen aktiv · {count} geplant
            </Txt>
          </Row>
        </Card>
      )}

      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <ListItem
          title="Alle Erinnerungen"
          subtitle={anyOn ? 'Mindestens eine Erinnerung ist aktiv' : 'Alle deaktiviert'}
          icon="bell"
          iconColor={colors.primary}
          right={
            <Switch
              value={anyOn}
              onValueChange={(v) => actions.setAllReminders(v)}
              trackColor={{ false: colors.track, true: colors.primary }}
              thumbColor="#fff"
              accessibilityLabel="Alle Erinnerungen"
            />
          }
        />
      </Card>

      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {state.reminders.map((r, i) => (
          <View key={r.id}>
            {i > 0 ? <Divider /> : null}
            <ListItem
              testID={`rem-${r.id}`}
              title={r.title}
              subtitle={describeSchedule(r)}
              icon={REMINDER_ICONS[r.type]}
              iconColor={r.enabled ? colors.primary : colors.muted}
              onPress={() => router.push({ pathname: '/settings/reminder-edit', params: { id: r.id } })}
              right={
                <Switch
                  value={r.enabled}
                  onValueChange={(v) => actions.updateReminder(r.id, { enabled: v })}
                  trackColor={{ false: colors.track, true: colors.primary }}
                  thumbColor="#fff"
                  accessibilityLabel={`${r.title} ein/aus`}
                  testID={`rem-switch-${r.id}`}
                />
              }
            />
          </View>
        ))}
      </Card>

      <Button title="Eigene Erinnerung hinzufügen" icon="plus" variant="soft" onPress={() => router.push('/settings/reminder-edit')} testID="rem-add" />
      {notificationsSupported ? (
        <Button
          title="Test-Benachrichtigung senden"
          icon="bell-ring-outline"
          variant="secondary"
          onPress={async () => {
            const ok = await sendTestNotification();
            toast(ok ? 'Test-Benachrichtigung kommt in 5 Sekunden' : 'Benachrichtigungen sind nicht erlaubt');
            refresh();
          }}
        />
      ) : null}
      <Txt variant="caption">
        Smarte Erinnerungen entfallen automatisch, wenn das Ziel schon erreicht ist (z. B. Wasserziel geschafft, Mahlzeit eingetragen, Challenge erledigt). Öffne die App
        regelmäßig, damit die Erinnerungen für die nächsten Tage geplant werden.
      </Txt>
    </Screen>
  );
}

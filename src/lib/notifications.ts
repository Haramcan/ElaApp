import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planNotifications, planSignature } from './reminderPlan';
import type { AppState } from './types';

export const CHANNEL_ID = 'reminders';
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let handlerSet = false;
let lastSignature = '';
let running: Promise<void> | null = null;
let pending: AppState | null = null;

export function setupNotificationHandler() {
  if (!notificationsSupported || handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Erinnerungen',
    description: 'Erinnerungen an Wasser, Mahlzeiten, Training und Challenges',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#16a34a',
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermissionState(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    if (res.granted) {
      lastSignature = '';
      return 'granted';
    }
    return res.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

async function doSync(state: AppState, force: boolean) {
  if (!state.onboarded) return;
  const perm = await getPermissionState();
  if (perm !== 'granted') return;
  const plan = planNotifications(state);
  const sig = planSignature(plan);
  if (!force && sig === lastSignature) return;
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const p of plan) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: p.title,
        body: p.body,
        data: { url: p.url },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.date,
        channelId: CHANNEL_ID,
      },
    });
  }
  lastSignature = sig;
}

/** (Re)schedules all reminder notifications; serialised and deduplicated */
export function syncNotifications(state: AppState, force = false): Promise<void> {
  if (!notificationsSupported) return Promise.resolve();
  if (running) {
    pending = state;
    return running;
  }
  running = (async () => {
    try {
      await doSync(state, force);
    } catch (e) {
      console.warn('Benachrichtigungen konnten nicht geplant werden', e);
    } finally {
      running = null;
      if (pending) {
        const next = pending;
        pending = null;
        void syncNotifications(next);
      }
    }
  })();
  return running;
}

export async function scheduledCount(): Promise<number> {
  if (!notificationsSupported) return 0;
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const perm = await requestPermission();
  if (perm !== 'granted') return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Test-Erinnerung 🔔', body: 'So sehen deine Erinnerungen aus. Weiter so! 💪', data: { url: '/' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
  return true;
}

export async function cancelAll() {
  if (!notificationsSupported) return;
  lastSignature = '';
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

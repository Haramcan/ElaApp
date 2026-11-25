import * as Notifications from 'expo-notifications';

import LiveStatus from './LiveStatus.android';
import type { LiveStatusProps } from './types';

export const liveSupported = true;

const ID = 'fitlife-live';
const CHANNEL = 'live-status';
let channelReady = false;

async function ensureChannel() {
  if (channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Live-Anzeige',
    description: 'Dauerhafte Anzeige deines Fortschritts (Schritte, Training, Fasten)',
    importance: Notifications.AndroidImportance.LOW,
    showBadge: false,
  });
  channelReady = true;
}

export async function showLiveStatus(props: LiveStatusProps): Promise<void> {
  try {
    await ensureChannel();
    await LiveStatus.post(props, {
      id: ID,
      channelId: CHANNEL,
      title: `${props.title}: ${props.value}`,
      text: props.sub,
      ongoing: true,
      autoCancel: false,
      alertOnlyOnce: true,
      url: 'fitlife://',
      color: '#16a34a',
    });
  } catch {
    // notifications disabled – nothing to show
  }
}

export async function hideLiveStatus(): Promise<void> {
  try {
    await LiveStatus.cancelAll();
  } catch {
    // ignore
  }
}

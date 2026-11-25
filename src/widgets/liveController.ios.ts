import type { LiveActivity } from 'expo-widgets';

import LiveStatus from './LiveStatus.ios';
import type { LiveStatusProps } from './types';

export const liveSupported = true;

let current: LiveActivity<LiveStatusProps> | null = null;

function instance(): LiveActivity<LiveStatusProps> | null {
  if (current) return current;
  try {
    current = LiveStatus.getInstances()[0] ?? null;
  } catch {
    current = null;
  }
  return current;
}

export async function showLiveStatus(props: LiveStatusProps): Promise<void> {
  try {
    const existing = instance();
    if (existing) {
      try {
        await existing.update(props);
        return;
      } catch {
        // ended by the system (e.g. after 8 hours) – start a new one
        current = null;
      }
    }
    current = LiveStatus.start(props, 'fitlife://');
  } catch {
    // Live Activities disabled by the user or unsupported device
    current = null;
  }
}

export async function hideLiveStatus(): Promise<void> {
  try {
    for (const i of LiveStatus.getInstances()) await i.end('immediate');
  } catch {
    // ignore
  }
  current = null;
}

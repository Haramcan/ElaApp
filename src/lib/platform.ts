import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

import { useStore } from './store';

/** Cross-platform confirm dialog (Alert on native, window.confirm on web) */
export function confirm(title: string, message: string, confirmText = 'OK', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as { confirm?: (m: string) => boolean };
    return Promise.resolve(g.confirm ? g.confirm(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as { alert?: (m: string) => void };
    g.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function useHaptics() {
  const { state } = useStore();
  const enabled = state.settings.haptics && Platform.OS !== 'web';
  return {
    tap: () => {
      if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    medium: () => {
      if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    },
    success: () => {
      if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    warning: () => {
      if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },
  };
}

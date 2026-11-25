import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';

import { ACHIEVEMENTS, newlyUnlocked } from '../lib/achievements';
import { dateKey, parseKey } from '../lib/date';
import { readHealth, writeWeight, writeWorkout } from '../lib/health';
import { buildLiveProps, buildWidgetProps } from '../lib/widgetData';
import FitWidget from '../widgets/FitWidget';
import { hideLiveStatus, liveSupported, showLiveStatus } from '../widgets/liveController';
import { useToday } from '../lib/hooks';
import { notificationsSupported, setupNotificationHandler, syncNotifications } from '../lib/notifications';
import { useHaptics } from '../lib/platform';
import { useStore } from '../lib/store';
import { useToast } from './Toast';

setupNotificationHandler();

/** Background side effects: reminders, achievements, pedometer, notification taps */
export function AppEffects() {
  const { state, actions, ready } = useStore();
  const toast = useToast();
  const haptics = useHaptics();
  const today = useToday();
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // --- reschedule reminders (debounced) whenever relevant data changes
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    const t = setTimeout(() => void syncNotifications(stateRef.current), 1500);
    return () => clearTimeout(t);
  }, [ready, state, today]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active' && stateRef.current.onboarded) void syncNotifications(stateRef.current);
    });
    return () => sub.remove();
  }, []);

  // --- navigate when a notification is tapped
  useEffect(() => {
    if (!notificationsSupported || !ready) return;
    const open = (url: unknown) => {
      if (typeof url !== 'string' || !stateRef.current.onboarded) return;
      setTimeout(() => {
        try {
          router.navigate(url as never);
        } catch {
          // ignore invalid routes
        }
      }, 50);
    };
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) {
          open(r.notification.request.content.data?.url);
          void Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data?.url));
    return () => sub.remove();
  }, [ready]);

  // --- achievements
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    const ids = newlyUnlocked(state);
    if (ids.length === 0) return;
    actions.unlockAchievements(ids);
    // first run after an import / update: unlock silently if many at once
    if (ids.length <= 2) {
      const a = ACHIEVEMENTS.find((x) => x.id === ids[0]);
      if (a) {
        haptics.success();
        toast({ message: `Erfolg freigeschaltet: ${a.title}`, icon: 'trophy', actionLabel: 'Ansehen', onAction: () => router.push('/achievements') });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state]);

  // --- home screen widget + Live Activity / ongoing notification
  const lastWidget = useRef('');
  const lastLive = useRef('');
  useEffect(() => {
    if (!ready || !state.onboarded || Platform.OS === 'web') return;
    const t = setTimeout(() => {
      const s = stateRef.current;
      const widget = buildWidgetProps(s, today);
      const wsig = JSON.stringify({ ...widget, updated: '' });
      if (wsig !== lastWidget.current) {
        lastWidget.current = wsig;
        try {
          FitWidget.updateSnapshot(widget);
        } catch {
          // widgets not available in this build
        }
      }
      if (!liveSupported) return;
      const live = s.settings.liveStatus ? buildLiveProps(s, today) : null;
      const lsig = live ? JSON.stringify({ ...live, progress: Math.round(live.progress * 50) }) : 'off';
      if (lsig === lastLive.current) return;
      lastLive.current = lsig;
      if (live) void showLiveStatus(live);
      else void hideLiveStatus();
    }, 1200);
    return () => clearTimeout(t);
  }, [ready, state, today]);

  // --- Apple Health / Health Connect: read on start + foreground, write new weights & workouts
  const healthOn = state.settings.healthSync && state.onboarded && ready;
  useEffect(() => {
    if (!healthOn || Platform.OS === 'web') return;
    let last = 0;
    const pull = () => {
      if (Date.now() - last < 5 * 60000) return;
      last = Date.now();
      void readHealth(7)
        .then((d) => actions.mergeHealthData(d))
        .catch(() => {});
    };
    pull();
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') pull();
    });
    return () => sub.remove();
  }, [healthOn, actions]);

  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!ready) return;
    const ids = new Set([...state.workouts.map((w) => w.id), ...state.weights.map((w) => w.id)]);
    const prev = knownIds.current;
    knownIds.current = ids;
    if (!prev || !healthOn || Platform.OS === 'web') return;
    const fresh = (createdAt: number) => Date.now() - createdAt < 2 * 60000;
    for (const w of state.weights) {
      if (!prev.has(w.id) && fresh(w.createdAt)) {
        const d = parseKey(w.date);
        d.setHours(8, 0, 0, 0);
        void writeWeight(w.kg, d);
      }
    }
    for (const w of state.workouts) {
      if (!prev.has(w.id) && fresh(w.createdAt)) {
        const end = new Date(w.createdAt);
        const start = new Date(w.createdAt - w.durationMin * 60000);
        void writeWorkout({ start, end, kcal: w.kcal, title: w.name, strength: w.exerciseId === 'weights' || w.exerciseId === 'pushups' || w.exerciseId === 'squats' });
      }
    }
  }, [ready, healthOn, state.workouts, state.weights]);

  // --- pedometer
  const usePedo = state.settings.usePedometer && state.onboarded && ready && !(Platform.OS === 'ios' && state.settings.healthSync);
  useEffect(() => {
    if (!usePedo || Platform.OS === 'web') return;
    let cancelled = false;
    let sub: { remove: () => void } | null = null;
    let iosTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available || cancelled) return;
        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted || cancelled) return;

        if (Platform.OS === 'ios') {
          const poll = async () => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            try {
              const res = await Pedometer.getStepCountAsync(start, new Date());
              const key = dateKey();
              if (!cancelled && res.steps > (stateRef.current.steps[key] ?? 0)) actions.setSteps(key, res.steps);
            } catch {
              // ignore
            }
          };
          await poll();
          iosTimer = setInterval(poll, 60000);
        } else {
          let last = 0;
          sub = Pedometer.watchStepCount((r) => {
            const delta = r.steps - last;
            last = r.steps;
            if (delta > 0 && delta < 5000) actions.addSteps(dateKey(), delta);
          });
        }
      } catch {
        // pedometer not available (e.g. Expo Go restrictions) – manual entry still works
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      if (iosTimer) clearInterval(iosTimer);
    };
  }, [usePedo, actions]);

  return null;
}

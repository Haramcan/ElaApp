import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Platform, Pressable, Share, TextInput, View } from 'react-native';

import { displayWeight, formatNumber, parseNumber } from '../lib/calc';
import { formatClock } from '../lib/date';
import { formatSets, getGymExercise, lastPerformance, sessionLogsFromDay } from '../lib/gym';
import { useNow } from '../lib/hooks';
import { confirm, useHaptics } from '../lib/platform';
import { useStore } from '../lib/store';
import { radius, useTheme } from '../lib/theme';
import { encodePlan, shareMessage } from '../lib/planShare';
import type { PlanDay, TrainingPlan } from '../lib/types';
import { useToast } from './Toast';
import { Button, IconButton, Row, Txt } from './ui';

/** Compact numeric field for the set table (accepts comma decimals) */
export function SetField({
  value,
  onChange,
  placeholder,
  decimals = 1,
  testID,
  label,
  done,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  decimals?: number;
  testID?: string;
  label: string;
  done?: boolean;
}) {
  const { colors } = useTheme();
  const fmt = (v: number | null) => (v == null ? '' : formatNumber(v, decimals).replace(/\./g, ''));
  const [text, setText] = useState(fmt(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (parseNumber(text) !== value) setText(fmt(value));
  }
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={label}
      value={text}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      selectTextOnFocus
      maxLength={6}
      onChangeText={(t) => {
        const cleaned = t.replace(/[^0-9.,]/g, '');
        setText(cleaned);
        const n = parseNumber(cleaned);
        if (cleaned === '') onChange(null);
        else if (n != null && n >= 0) onChange(n);
      }}
      style={[
        {
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '700',
          color: colors.text,
          backgroundColor: done ? colors.primarySoft : colors.cardAlt,
          borderRadius: radius.sm,
          paddingVertical: 9,
        },
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
      ]}
    />
  );
}

/** Sticky rest timer shown after a set is completed */
export function RestTimer({ endAt, total, onChange }: { endAt: number; total: number; onChange: (endAt: number | null) => void }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const toast = useToast();
  const now = useNow(250);
  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
  const fired = useRef(false);

  useEffect(() => {
    if (remaining === 0 && !fired.current && now > 0) {
      fired.current = true;
      haptics.success();
      toast({ message: 'Pause vorbei – auf zum nächsten Satz! 💪', icon: 'timer-outline' });
      onChange(null);
    }
  }, [remaining, now, haptics, toast, onChange]);

  const pct = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 1;
  return (
    <View
      testID="rest-timer"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}
    >
      <Row justify="space-between">
        <View>
          <Txt variant="caption">Satzpause</Txt>
          <Txt variant="h2" style={{ fontVariant: ['tabular-nums'] }}>
            {formatClock(remaining)}
          </Txt>
        </View>
        <Row gap={6}>
          <Button small title="−15 s" variant="secondary" full={false} onPress={() => onChange(Math.max(Date.now() + 1000, endAt - 15000))} />
          <Button small title="+15 s" variant="secondary" full={false} onPress={() => onChange(endAt + 15000)} />
          <Button small title="Weiter" full={false} onPress={() => onChange(null)} testID="rest-skip" />
        </Row>
      </Row>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: 6, backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}

/** Starts a gym session (optionally from a plan day); asks before replacing a running one */
export function useStartGym() {
  const { state, actions } = useStore();
  return async (opts: { plan?: TrainingPlan; day?: PlanDay; name?: string; exercises?: ReturnType<typeof sessionLogsFromDay> } = {}) => {
    if (state.gym.active) {
      const resume = await confirm(
        'Training läuft bereits',
        `„${state.gym.active.name}“ ist noch nicht beendet. Möchtest du es fortsetzen?`,
        'Fortsetzen',
      );
      if (resume) router.push('/gym/session');
      return;
    }
    const exercises = opts.exercises ?? (opts.day ? sessionLogsFromDay(state, opts.day) : []);
    actions.startGymSession({
      name: opts.name ?? (opts.day ? `${opts.day.name}` : 'Freies Training'),
      planId: opts.plan?.id,
      dayId: opts.day?.id,
      exercises,
    });
    router.push('/gym/session');
  };
}

/** One-line preview of what was done last time */
export function LastTimeLine({ exerciseId, excludeSessionId }: { exerciseId: string; excludeSessionId?: string }) {
  const { state } = useStore();
  const wu = state.settings.weightUnit;
  const last = lastPerformance(state, exerciseId, excludeSessionId);
  if (!last) return <Txt variant="caption">Noch nie gemacht</Txt>;
  return (
    <Txt variant="caption" numberOfLines={2}>
      Zuletzt ({new Date(last.session.start).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}):{' '}
      {formatSets(last.log, (kg) => `${formatNumber(displayWeight(kg, wu), 1)} ${wu}`)}
    </Txt>
  );
}

export function ActiveSessionBanner() {
  const { state } = useStore();
  const { colors } = useTheme();
  const a = state.gym.active;
  const now = useNow(1000, !!a);
  if (!a) return null;
  const done = a.exercises.reduce((n, l) => n + l.sets.filter((s) => s.done).length, 0);
  return (
    <Pressable
      testID="gym-resume"
      accessibilityRole="button"
      onPress={() => router.push('/gym/session')}
      style={({ pressed }) => ({
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="caption" color={colors.onPrimary}>
          Training läuft · {formatClock(Math.max(0, (now - a.start) / 1000))}
        </Txt>
        <Txt variant="h3" color={colors.onPrimary} numberOfLines={1}>
          {a.name} · {done} Sätze
        </Txt>
      </View>
      <Txt bold color={colors.onPrimary}>
        Fortsetzen ›
      </Txt>
    </Pressable>
  );
}

export function exerciseLabel(state: ReturnType<typeof useStore>['state'], id: string) {
  return getGymExercise(state, id)?.name ?? 'Gelöschte Übung';
}

export function SmallIconButton(props: { icon: string; label: string; onPress: () => void; disabled?: boolean; color?: string; testID?: string }) {
  return <IconButton size={18} {...props} />;
}

/** Shares a plan as text (chat, mail …); falls back to copying it on platforms without a share sheet */
export function useSharePlan() {
  const { state } = useStore();
  const toast = useToast();
  return async (plan: TrainingPlan, from?: string) => {
    const code = encodePlan(state, plan, from ?? state.profile.name);
    const message = shareMessage(code, plan.name, from ?? state.profile.name);
    try {
      if (Platform.OS === 'web') {
        const nav = (globalThis as { navigator?: { share?: (d: { text: string; title: string }) => Promise<void> } }).navigator;
        if (nav?.share) await nav.share({ title: plan.name, text: message });
        else {
          await Clipboard.setStringAsync(message);
          toast({ message: 'Plan in die Zwischenablage kopiert', icon: 'content-copy' });
        }
        return;
      }
      await Share.share({ title: `Trainingsplan: ${plan.name}`, message });
    } catch {
      await Clipboard.setStringAsync(message).catch(() => {});
      toast({ message: 'Plan in die Zwischenablage kopiert', icon: 'content-copy' });
    }
  };
}

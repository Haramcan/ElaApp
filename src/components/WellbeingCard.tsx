import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatNumber } from '../lib/calc';
import { useHaptics } from '../lib/platform';
import { useStore } from '../lib/store';
import { radius, useTheme } from '../lib/theme';
import { Card, Icon, Row, Stepper, Txt } from './ui';

export const MOODS = [
  { score: 1, emoji: '😣', label: 'Schlecht' },
  { score: 2, emoji: '😕', label: 'Mäßig' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Gut' },
  { score: 5, emoji: '😄', label: 'Super' },
];

export function MoodPicker({ value, onChange, testIDPrefix }: { value?: number; onChange: (v: number) => void; testIDPrefix?: string }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  return (
    <Row justify="space-between">
      {MOODS.map((m) => {
        const sel = value === m.score;
        return (
          <Pressable
            key={m.score}
            testID={testIDPrefix ? `${testIDPrefix}-${m.score}` : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Stimmung ${m.label}`}
            accessibilityState={{ selected: sel }}
            onPress={() => {
              haptics.tap();
              onChange(m.score);
            }}
            style={{
              alignItems: 'center',
              padding: 6,
              borderRadius: radius.md,
              backgroundColor: sel ? colors.primarySoft : 'transparent',
              borderWidth: 1.5,
              borderColor: sel ? colors.primary : 'transparent',
              minWidth: 52,
            }}
          >
            <Text style={{ fontSize: 26, opacity: value && !sel ? 0.45 : 1 }}>{m.emoji}</Text>
            <Txt variant="caption">{m.label}</Txt>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Quick daily check-in for sleep and mood shown on the dashboard */
export function WellbeingCard({ date }: { date: string }) {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const sleep = state.sleep[date];
  const mood = state.mood[date];
  return (
    <Card style={{ gap: 12 }} testID="wellbeing-card">
      <Row justify="space-between">
        <Row gap={8}>
          <Icon name="weather-night" color={colors.primary} />
          <Txt variant="h3">Schlaf & Stimmung</Txt>
        </Row>
        <Pressable onPress={() => router.push('/wellbeing')} hitSlop={8} accessibilityRole="button">
          <Txt bold color={colors.primary}>
            Verlauf
          </Txt>
        </Pressable>
      </Row>
      <Row justify="space-between">
        <View>
          <Txt variant="small">Schlaf letzte Nacht</Txt>
          {sleep?.source === 'health' ? <Txt variant="caption">aus Health-App</Txt> : null}
        </View>
        <Stepper
          value={sleep?.hours ?? 7}
          onChange={(v) => actions.setSleep(date, { hours: v, quality: sleep?.quality, source: 'manual' })}
          step={0.5}
          min={0}
          max={16}
          format={(v) => (sleep ? `${formatNumber(v, 1)} h` : '– h')}
          label="Schlaf"
          testID="sleep-stepper"
        />
      </Row>
      <MoodPicker value={mood?.score} onChange={(v) => actions.setMood(date, { ...(mood ?? {}), score: v })} testIDPrefix="mood" />
    </Card>
  );
}

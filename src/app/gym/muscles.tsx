import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { BodyMap } from '../../components/BodyMap';
import { Badge, Button, Card, Divider, ProgressBar, Row, Screen, Txt } from '../../components/ui';
import { formatNumber } from '../../lib/calc';
import { MUSCLE_LABELS } from '../../lib/gym';
import { useNow } from '../../lib/hooks';
import { MAP_MUSCLES, muscleStats, recommendedMuscles, STATUS_LABELS, WEEKLY_SET_TARGET } from '../../lib/muscles';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function Muscles() {
  const { state } = useStore();
  const { colors } = useTheme();
  const now = useNow(60000);
  const stats = useMemo(() => muscleStats(state, now), [state, now]);
  const rec = recommendedMuscles(stats);

  const statusColor = (s: string) =>
    s === 'fresh' ? { c: colors.warning, bg: colors.warningSoft } : s === 'recovering' ? { c: colors.water, bg: colors.waterSoft } : s === 'ready' ? { c: colors.success, bg: colors.primarySoft } : { c: colors.textSecondary, bg: colors.cardAlt };

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 6 }}>
        <Txt variant="h3">Sätze der letzten 7 Tage</Txt>
        <BodyMap stats={stats} />
      </Card>

      <Card style={{ gap: 8, backgroundColor: colors.primarySoft }} testID="muscle-recommendation">
        <Txt variant="h3">Empfehlung fürs nächste Training</Txt>
        <Txt variant="small">
          {rec.length > 0
            ? `Diese Woche noch wenig trainiert und erholt: ${rec
                .slice(0, 3)
                .map((m) => MUSCLE_LABELS[m])
                .join(', ')}.`
            : 'Alle großen Muskelgruppen sind diese Woche gut abgedeckt – stark! Gönn frisch trainierten Muskeln 48 h Pause.'}
        </Txt>
        <Txt variant="caption">
          Richtwert: {WEEKLY_SET_TARGET.min}–{WEEKLY_SET_TARGET.max} Arbeitssätze pro Muskelgruppe und Woche.
        </Txt>
      </Card>

      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {MAP_MUSCLES.map((m, i) => {
          const st = stats[m];
          const sc = statusColor(st.status);
          return (
            <View key={m} style={{ paddingVertical: 10, gap: 6 }} testID={`muscle-${m}`}>
              {i > 0 ? <Divider /> : null}
              <Row justify="space-between">
                <Txt bold>{MUSCLE_LABELS[m]}</Txt>
                <Badge label={STATUS_LABELS[st.status]} color={sc.c} bg={sc.bg} />
              </Row>
              <ProgressBar value={st.sets} max={WEEKLY_SET_TARGET.min} />
              <Txt variant="caption">
                {formatNumber(st.sets, 1)} Sätze diese Woche
                {st.hoursAgo != null ? ` · zuletzt vor ${st.hoursAgo < 48 ? `${Math.round(st.hoursAgo)} h` : `${Math.round(st.hoursAgo / 24)} Tagen`}` : ''}
              </Txt>
            </View>
          );
        })}
      </Card>
      <Button title="Training starten" icon="play" onPress={() => router.push('/gym')} />
    </Screen>
  );
}

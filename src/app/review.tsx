import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BarChart } from '../components/charts';
import { Card, Icon, IconButton, Row, Screen, SectionHeader, StatTile, Txt } from '../components/ui';
import { energyValue, formatNumber } from '../lib/calc';
import { addDays, formatShortDate, weekdayShort } from '../lib/date';
import { useToday } from '../lib/hooks';
import { weekReview } from '../lib/review';
import { daySummary } from '../lib/selectors';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function Review() {
  const { state } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const anchor = addDays(today, -7 * offset);
  const r = useMemo(() => weekReview(state, anchor, today), [state, anchor, today]);
  const eu = state.settings.energyUnit;
  const kcalData = r.days.map((d) => ({ label: weekdayShort(d), value: d <= today ? energyValue(daySummary(state, d).eaten, eu) : 0 }));
  const weightDiff = r.weightStart != null && r.weightEnd != null ? r.weightEnd - r.weightStart : undefined;

  return (
    <Screen edges={['bottom']}>
      <Row justify="space-between">
        <IconButton icon="chevron-left" label="Vorherige Woche" onPress={() => setOffset(offset + 1)} testID="review-prev" />
        <View style={{ alignItems: 'center' }}>
          <Txt variant="h3">{offset === 0 ? 'Diese Woche' : offset === 1 ? 'Letzte Woche' : `vor ${offset} Wochen`}</Txt>
          <Txt variant="caption">
            {formatShortDate(r.start)} – {formatShortDate(r.end)}
          </Txt>
        </View>
        <IconButton icon="chevron-right" label="Nächste Woche" onPress={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} />
      </Row>

      {r.highlights.length > 0 ? (
        <Card style={{ gap: 8, backgroundColor: colors.primarySoft }} testID="review-highlights">
          <Txt variant="h3">Highlights 🎉</Txt>
          {r.highlights.map((h) => (
            <Row key={h} gap={8} align="flex-start">
              <Icon name="check-circle" size={18} color={colors.success} />
              <Txt variant="small" style={{ flex: 1 }}>
                {h}
              </Txt>
            </Row>
          ))}
        </Card>
      ) : null}

      <Row gap={10}>
        <StatTile label="Training" value={`${r.workouts}/${r.workoutGoal}`} unit="Tage" icon="dumbbell" />
        <StatTile label="Ø Kalorien" value={r.loggedDays ? formatNumber(energyValue(r.avgKcal, eu)) : '–'} unit={r.loggedDays ? eu : undefined} icon="silverware-fork-knife" />
      </Row>
      <Row gap={10}>
        <StatTile label="Im Ziel (±10 %)" value={`${r.onTargetDays}/${r.elapsedDays}`} unit="Tage" icon="target" />
        <StatTile label="Gewicht" value={weightDiff != null ? `${weightDiff > 0 ? '+' : ''}${formatNumber(weightDiff, 1)}` : '–'} unit={weightDiff != null ? 'kg' : undefined} icon="scale-bathroom" />
      </Row>
      <Row gap={10}>
        <StatTile label="Ø Eiweiß" value={r.loggedDays ? formatNumber(r.avgProtein) : '–'} unit="g" icon="food-drumstick" />
        <StatTile label="Wasserziel" value={`${r.waterGoalDays}/${r.elapsedDays}`} unit="Tage" icon="cup-water" color={colors.water} />
      </Row>
      <Row gap={10}>
        <StatTile label="Ø Schritte" value={r.avgSteps ? formatNumber(r.avgSteps) : '–'} icon="shoe-print" />
        <StatTile label="Challenges" value={`${r.challengeDays}/${r.elapsedDays}`} unit="Tage" icon="arm-flex" />
      </Row>
      <Row gap={10}>
        <StatTile label="Ø Schlaf" value={r.avgSleep != null ? formatNumber(r.avgSleep, 1) : '–'} unit={r.avgSleep != null ? 'h' : undefined} icon="sleep" />
        <StatTile label="Ø Stimmung" value={r.avgMood != null ? formatNumber(r.avgMood, 1) : '–'} unit={r.avgMood != null ? '/ 5' : undefined} icon="emoticon-outline" />
      </Row>
      {r.gymSessions > 0 ? (
        <Row gap={10}>
          <StatTile label="Krafttrainings" value={String(r.gymSessions)} icon="weight-lifter" />
          <StatTile label="Volumen" value={formatNumber(r.gymVolume)} unit="kg" icon="weight" />
        </Row>
      ) : null}

      <SectionHeader title="Kalorien pro Tag" />
      <Card>
        <BarChart data={kcalData} goal={energyValue(r.avgGoal, eu)} unit={eu} overColor={colors.danger} height={160} />
      </Card>

      <SectionHeader title="Tipps für nächste Woche" />
      <Card style={{ gap: 8 }} testID="review-tips">
        {r.tips.map((t) => (
          <Row key={t} gap={8} align="flex-start">
            <Icon name="lightbulb-on-outline" size={18} color={colors.warning} />
            <Txt variant="small" style={{ flex: 1 }}>
              {t}
            </Txt>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

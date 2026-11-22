import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BarChart, LineChart } from '../../components/charts';
import { Button, Card, Icon, ProgressBar, Row, Screen, SectionHeader, Segmented, StatTile, Txt } from '../../components/ui';
import { ACHIEVEMENTS } from '../../lib/achievements';
import { bmi, bmiCategory, displayWeight, energyValue, formatNumber, formatWeight } from '../../lib/calc';
import { addDays, formatShortDate, lastNDays, weekdayShort } from '../../lib/date';
import { useToday } from '../../lib/hooks';
import { currentStreak, daySummary, latestWeightKg, longestStreak, sortedWeights } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

type Range = 30 | 90 | 365 | 0;

export default function Progress() {
  const { state } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const [range, setRange] = useState<Range>(90);
  const [kcalDays, setKcalDays] = useState<7 | 30>(7);
  const wu = state.settings.weightUnit;
  const eu = state.settings.energyUnit;

  const weights = useMemo(() => sortedWeights(state), [state]);
  const current = latestWeightKg(state);
  const start = state.profile.startWeightKg;
  const target = state.profile.targetWeightKg;
  const change = current - start;
  const totalToLose = Math.abs(start - target);
  const progressDone = totalToLose > 0 ? Math.min(1, Math.max(0, (state.profile.goal === 'gain' ? current - start : start - current) / totalToLose)) : 1;
  const bmiValue = bmi(current, state.profile.heightCm);

  const weightData = useMemo(() => {
    const from = range === 0 ? '0000-00-00' : addDays(today, -range);
    return weights.filter((w) => w.date >= from).map((w) => ({ label: formatShortDate(w.date), value: displayWeight(w.kg, wu) }));
  }, [weights, range, today, wu]);

  const days = useMemo(() => lastNDays(kcalDays, today), [kcalDays, today]);
  const summaries = useMemo(() => days.map((d) => daySummary(state, d)), [days, state]);
  const kcalData = summaries.map((s) => ({
    label: kcalDays === 7 ? weekdayShort(s.date) : formatShortDate(s.date),
    value: energyValue(s.eaten, eu),
    detail: `Ziel ${formatNumber(energyValue(s.goal, eu))}`,
  }));
  const logged = summaries.filter((s) => s.eaten > 0);
  const avgKcal = logged.length ? logged.reduce((a, s) => a + s.eaten, 0) / logged.length : 0;
  const avgProtein = logged.length ? logged.reduce((a, s) => a + s.protein, 0) / logged.length : 0;
  const waterData = summaries.slice(-7).map((s) => ({ label: weekdayShort(s.date), value: s.water / 1000 }));
  const stepsData = summaries.slice(-7).map((s) => ({ label: weekdayShort(s.date), value: s.steps }));

  const unlocked = ACHIEVEMENTS.filter((a) => state.unlockedAchievements[a.id]).length;

  return (
    <Screen>
      <Txt variant="title">Fortschritt</Txt>

      <Row gap={10}>
        <StatTile label="Serie" value={String(currentStreak(state, today))} unit={currentStreak(state, today) === 1 ? 'Tag' : 'Tage'} icon="fire" color={colors.fire} />
        <StatTile label="Rekord" value={String(longestStreak(state))} unit={longestStreak(state) === 1 ? 'Tag' : 'Tage'} icon="medal" />
        <StatTile label="Erfolge" value={`${unlocked}/${ACHIEVEMENTS.length}`} icon="trophy" />
      </Row>

      <SectionHeader title="Gewicht" action="Eintragen" onAction={() => router.push('/weight')} testID="progress-weight-add" />
      <Card style={{ gap: 12 }}>
        <Row justify="space-between">
          <View>
            <Txt variant="caption">Aktuell</Txt>
            <Txt variant="h2">{formatWeight(current, wu)}</Txt>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Txt variant="caption">Veränderung</Txt>
            <Txt variant="h3" color={(state.profile.goal === 'gain' ? change >= 0 : change <= 0) ? colors.success : colors.warning}>
              {change > 0 ? '+' : ''}
              {formatNumber(displayWeight(change, wu), 1)} {wu}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="caption">Ziel</Txt>
            <Txt variant="h3">{formatWeight(target, wu)}</Txt>
          </View>
        </Row>
        {state.profile.goal !== 'maintain' ? (
          <View style={{ gap: 4 }}>
            <ProgressBar value={progressDone} max={1} height={10} />
            <Txt variant="caption">
              {Math.round(progressDone * 100)} % geschafft · noch {formatNumber(displayWeight(Math.abs(current - target), wu), 1)} {wu}
            </Txt>
          </View>
        ) : null}
        <Segmented
          options={[
            { value: 30, label: '1 M' },
            { value: 90, label: '3 M' },
            { value: 365, label: '1 J' },
            { value: 0, label: 'Alle' },
          ]}
          value={range}
          onChange={setRange}
        />
        {weightData.length >= 2 ? (
          <LineChart data={weightData} target={displayWeight(target, wu)} unit={wu} testID="weight-chart" />
        ) : (
          <Txt variant="small" center style={{ paddingVertical: 20 }}>
            Trage mindestens zwei Gewichtswerte ein, um deinen Verlauf zu sehen.
          </Txt>
        )}
        <Row gap={8}>
          <Icon name="human" size={18} color={colors.textSecondary} />
          <Txt variant="small">
            BMI {formatNumber(bmiValue, 1)} · {bmiCategory(bmiValue)}
          </Txt>
        </Row>
      </Card>

      <SectionHeader title="Kalorien" />
      <Card style={{ gap: 12 }}>
        <Segmented
          options={[
            { value: 7, label: '7 Tage' },
            { value: 30, label: '30 Tage' },
          ]}
          value={kcalDays}
          onChange={setKcalDays}
        />
        <BarChart data={kcalData} goal={energyValue(daySummary(state, today).baseGoal, eu)} unit={eu} overColor={colors.danger} testID="kcal-chart" />
        <Row justify="space-between">
          <Txt variant="small">Ø Kalorien (erfasste Tage)</Txt>
          <Txt variant="small" bold>
            {formatNumber(energyValue(avgKcal, eu))} {eu}
          </Txt>
        </Row>
        <Row justify="space-between">
          <Txt variant="small">Ø Eiweiß</Txt>
          <Txt variant="small" bold>
            {formatNumber(avgProtein)} g
          </Txt>
        </Row>
        <Row justify="space-between">
          <Txt variant="small">Erfasste Tage</Txt>
          <Txt variant="small" bold>
            {logged.length}/{kcalDays}
          </Txt>
        </Row>
      </Card>

      <SectionHeader title="Wasser (7 Tage)" />
      <Card>
        <BarChart data={waterData} goal={state.goals.waterMl / 1000} unit="l" color={colors.water} height={150} />
      </Card>

      <SectionHeader title="Schritte (7 Tage)" />
      <Card>
        <BarChart data={stepsData} goal={state.goals.steps} unit="Schritte" height={150} />
      </Card>

      <Row gap={10}>
        <Button title="Erfolge" icon="trophy-outline" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => router.push('/achievements')} />
        <Button title="Tagesverlauf" icon="calendar-month" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => router.push('/history')} />
      </Row>
    </Screen>
  );
}

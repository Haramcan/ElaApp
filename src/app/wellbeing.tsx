import React, { useMemo } from 'react';
import { View } from 'react-native';

import { BarChart } from '../components/charts';
import { MOODS, MoodPicker } from '../components/WellbeingCard';
import { Card, Chip, Divider, Input, Row, Screen, SectionHeader, Stepper, Txt } from '../components/ui';
import { formatNumber } from '../lib/calc';
import { formatDayLabel, lastNDays, weekdayShort } from '../lib/date';
import { useToday } from '../lib/hooks';
import { daySummary } from '../lib/selectors';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export default function Wellbeing() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const days = lastNDays(14, today);
  const sleep = state.sleep[today];
  const mood = state.mood[today];

  const sleepData = days.map((d) => ({ label: weekdayShort(d), value: state.sleep[d]?.hours ?? 0 }));
  const moodData = days.map((d) => ({ label: weekdayShort(d), value: state.mood[d]?.score ?? 0 }));

  const insights = useMemo(() => {
    const out: string[] = [];
    const all = Object.keys(state.mood).filter((d) => state.sleep[d]);
    const good = all.filter((d) => state.sleep[d].hours >= 7).map((d) => state.mood[d].score);
    const bad = all.filter((d) => state.sleep[d].hours < 7).map((d) => state.mood[d].score);
    if (good.length >= 2 && bad.length >= 2) {
      out.push(`Nach ≥ 7 h Schlaf ist deine Stimmung im Schnitt ${formatNumber(avg(good), 1)}, nach weniger Schlaf ${formatNumber(avg(bad), 1)}.`);
    }
    const trainDays = new Set(state.workouts.map((w) => w.date));
    const mt = Object.keys(state.mood).filter((d) => trainDays.has(d)).map((d) => state.mood[d].score);
    const mn = Object.keys(state.mood).filter((d) => !trainDays.has(d)).map((d) => state.mood[d].score);
    if (mt.length >= 2 && mn.length >= 2) out.push(`An Trainingstagen: Stimmung Ø ${formatNumber(avg(mt), 1)} – an anderen Tagen Ø ${formatNumber(avg(mn), 1)}.`);
    const sleepVals = Object.entries(state.sleep).filter(([d]) => daySummary(state, d).eaten > 0);
    const shortS = sleepVals.filter(([, s]) => s.hours < 6.5).map(([d]) => daySummary(state, d).eaten);
    const longS = sleepVals.filter(([, s]) => s.hours >= 7).map(([d]) => daySummary(state, d).eaten);
    if (shortS.length >= 2 && longS.length >= 2 && avg(shortS) > avg(longS) * 1.05) {
      out.push(`Nach kurzen Nächten isst du im Schnitt ${formatNumber(avg(shortS) - avg(longS))} kcal mehr.`);
    }
    if (out.length === 0) out.push('Trage ein paar Tage Schlaf und Stimmung ein – dann zeigen wir dir hier Zusammenhänge mit Training und Ernährung.');
    return out;
  }, [state]);

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 12 }}>
        <Txt variant="h3">Heute</Txt>
        <Row justify="space-between">
          <Txt>Schlaf letzte Nacht</Txt>
          <Stepper
            value={sleep?.hours ?? 7}
            onChange={(v) => actions.setSleep(today, { hours: v, quality: sleep?.quality, source: 'manual' })}
            step={0.5}
            min={0}
            max={16}
            format={(v) => (sleep ? `${formatNumber(v, 1)} h` : '– h')}
            label="Schlaf"
          />
        </Row>
        <Txt variant="small" bold>
          Schlafqualität
        </Txt>
        <Row gap={6} wrap>
          {['Schlecht', 'Mäßig', 'Okay', 'Gut', 'Super'].map((l, i) => (
            <Chip key={l} label={l} selected={sleep?.quality === i + 1} onPress={() => actions.setSleep(today, { hours: sleep?.hours ?? 7, quality: i + 1, source: 'manual' })} />
          ))}
        </Row>
        <Txt variant="small" bold>
          Stimmung
        </Txt>
        <MoodPicker value={mood?.score} onChange={(v) => actions.setMood(today, { ...(mood ?? {}), score: v })} />
        <Txt variant="small" bold>
          Energie
        </Txt>
        <Row gap={6} wrap>
          {['Sehr müde', 'Müde', 'Normal', 'Fit', 'Voller Energie'].map((l, i) => (
            <Chip key={l} label={l} selected={mood?.energy === i + 1} onPress={() => actions.setMood(today, { ...(mood ?? {}), score: mood?.score ?? 3, energy: i + 1 })} />
          ))}
        </Row>
        <Input label="Notiz (optional)" value={mood?.note ?? ''} onChangeText={(t) => actions.setMood(today, { ...(mood ?? {}), score: mood?.score ?? 3, note: t })} maxLength={140} placeholder="Wie war dein Tag?" />
        {state.settings.healthSync ? <Txt variant="caption">Schlafdaten werden automatisch aus der Health-App übernommen, wenn verfügbar.</Txt> : null}
      </Card>

      <SectionHeader title="Erkenntnisse" />
      <Card style={{ gap: 8 }}>
        {insights.map((i) => (
          <Txt key={i} variant="small">
            • {i}
          </Txt>
        ))}
      </Card>

      <SectionHeader title="Schlaf (14 Tage)" />
      <Card>
        <BarChart data={sleepData} goal={8} unit="h" color={colors.water} height={150} goalLabel="Empfehlung" />
      </Card>
      <SectionHeader title="Stimmung (14 Tage)" />
      <Card>
        <BarChart data={moodData} unit="/ 5" height={130} />
      </Card>

      <SectionHeader title="Verlauf" />
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {[...days].reverse().map((d, i) => {
          const s = state.sleep[d];
          const m = state.mood[d];
          if (!s && !m) return null;
          return (
            <View key={d} style={{ paddingVertical: 10 }}>
              {i > 0 ? <Divider /> : null}
              <Row justify="space-between">
                <Txt bold>{formatDayLabel(d, today)}</Txt>
                <Txt>
                  {s ? `${formatNumber(s.hours, 1)} h 😴` : ''} {m ? MOODS[m.score - 1]?.emoji : ''}
                </Txt>
              </Row>
              {m?.note ? <Txt variant="caption">{m.note}</Txt> : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

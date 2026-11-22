import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Icon, ProgressBar, Row, Screen, Txt } from '../components/ui';
import { energyValue, formatNumber } from '../lib/calc';
import { formatDayLabel, lastNDays } from '../lib/date';
import { useToday } from '../lib/hooks';
import { challengeProgress, daySummary, hasLoggedDay } from '../lib/selectors';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function History() {
  const { state } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const [count, setCount] = useState(14);
  const days = useMemo(() => lastNDays(count, today).reverse(), [count, today]);
  const eu = state.settings.energyUnit;

  return (
    <Screen edges={['bottom']}>
      {days.map((d) => {
        const s = daySummary(state, d);
        const cp = challengeProgress(state, d);
        const any = hasLoggedDay(state, d);
        const onTarget = s.eaten > 0 && s.eaten >= s.goal * 0.9 && s.eaten <= s.goal * 1.1;
        return (
          <Card key={d} style={{ gap: 8, opacity: any ? 1 : 0.6 }}>
            <Row justify="space-between">
              <Txt variant="h3">{formatDayLabel(d, today)}</Txt>
              {onTarget ? <Icon name="check-decagram" size={20} color={colors.success} /> : null}
            </Row>
            {any ? (
              <>
                <Row justify="space-between">
                  <Txt variant="small">
                    {formatNumber(energyValue(s.eaten, eu))} / {formatNumber(energyValue(s.goal, eu))} {eu}
                  </Txt>
                  <Txt variant="small">
                    E {formatNumber(s.protein)} · K {formatNumber(s.carbs)} · F {formatNumber(s.fat)} g
                  </Txt>
                </Row>
                <ProgressBar value={s.eaten} max={s.goal} overColor={colors.danger} height={6} />
                <Row gap={14} wrap>
                  <Mini icon="cup-water" text={`${formatNumber(s.water / 1000, 2)} l`} ok={s.water >= s.waterGoal} />
                  <Mini icon="shoe-print" text={formatNumber(s.steps)} ok={s.steps >= s.stepsGoal} />
                  <Mini icon="fire" text={`${formatNumber(s.burned)} kcal`} ok={s.burned > 0} />
                  <Mini icon="arm-flex" text={`${cp.completed}/${cp.total}`} ok={cp.total > 0 && cp.completed === cp.total} />
                </Row>
              </>
            ) : (
              <Txt variant="caption">Keine Einträge</Txt>
            )}
          </Card>
        );
      })}
      {count < 365 ? <Button title="Mehr laden" variant="secondary" onPress={() => setCount(count + 30)} /> : null}
    </Screen>
  );
}

function Mini({ icon, text, ok }: { icon: string; text: string; ok: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={14} color={ok ? colors.success : colors.muted} />
      <Txt variant="caption">{text}</Txt>
    </View>
  );
}

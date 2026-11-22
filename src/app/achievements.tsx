import React from 'react';
import { View } from 'react-native';

import { Card, Icon, ProgressBar, Row, Screen, Txt } from '../components/ui';
import { ACHIEVEMENTS, isUnlocked } from '../lib/achievements';
import { formatNumber } from '../lib/calc';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function Achievements() {
  const { state } = useStore();
  const { colors } = useTheme();
  const items = ACHIEVEMENTS.map((a) => {
    const [cur, target] = a.progress(state);
    return { a, cur, target, done: isUnlocked(a, state), at: state.unlockedAchievements[a.id] };
  }).sort((x, y) => Number(y.done) - Number(x.done));
  const count = items.filter((i) => i.done).length;

  return (
    <Screen edges={['bottom']}>
      <Card style={{ alignItems: 'center', gap: 6 }}>
        <Icon name="trophy" size={40} color={colors.warning} />
        <Txt variant="h1">
          {count} / {ACHIEVEMENTS.length}
        </Txt>
        <Txt variant="small">Erfolge freigeschaltet</Txt>
      </Card>
      {items.map(({ a, cur, target, done, at }) => (
        <Card key={a.id} style={{ opacity: done ? 1 : 0.85 }} testID={`ach-${a.id}`}>
          <Row gap={12}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: done ? colors.warningSoft : colors.cardAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={done ? a.icon : 'lock-outline'} color={done ? colors.warning : colors.muted} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="h3">{a.title}</Txt>
              <Txt variant="small">{a.description}</Txt>
              {!done ? (
                <>
                  <ProgressBar value={cur} max={target} height={6} />
                  <Txt variant="caption">
                    {formatNumber(cur)} / {formatNumber(target)}
                  </Txt>
                </>
              ) : at ? (
                <Txt variant="caption">Freigeschaltet am {new Date(at).toLocaleDateString('de-DE')}</Txt>
              ) : null}
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

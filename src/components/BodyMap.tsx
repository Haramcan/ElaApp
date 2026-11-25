import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';

import { intensity, type MuscleStat } from '../lib/muscles';
import { useTheme } from '../lib/theme';
import type { MuscleGroup } from '../lib/types';
import { Row, Txt } from './ui';

type Shape = { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number } | { kind: 'circle'; cx: number; cy: number; r: number };

/** Stylised front and back figures; each region belongs to one muscle group */
const FRONT: { muscle: MuscleGroup | null; shape: Shape }[] = [
  { muscle: null, shape: { kind: 'circle', cx: 50, cy: 14, r: 10 } }, // head
  { muscle: 'schultern', shape: { kind: 'circle', cx: 30, cy: 34, r: 7 } },
  { muscle: 'schultern', shape: { kind: 'circle', cx: 70, cy: 34, r: 7 } },
  { muscle: 'brust', shape: { kind: 'rect', x: 36, y: 30, w: 13, h: 16, r: 4 } },
  { muscle: 'brust', shape: { kind: 'rect', x: 51, y: 30, w: 13, h: 16, r: 4 } },
  { muscle: 'arme', shape: { kind: 'rect', x: 21, y: 42, w: 9, h: 30, r: 4 } },
  { muscle: 'arme', shape: { kind: 'rect', x: 70, y: 42, w: 9, h: 30, r: 4 } },
  { muscle: 'bauch', shape: { kind: 'rect', x: 39, y: 48, w: 22, h: 26, r: 5 } },
  { muscle: 'po', shape: { kind: 'rect', x: 37, y: 76, w: 26, h: 8, r: 4 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 36, y: 86, w: 12, h: 34, r: 5 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 52, y: 86, w: 12, h: 34, r: 5 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 37, y: 123, w: 10, h: 24, r: 4 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 53, y: 123, w: 10, h: 24, r: 4 } },
];

const BACK: { muscle: MuscleGroup | null; shape: Shape }[] = [
  { muscle: null, shape: { kind: 'circle', cx: 50, cy: 14, r: 10 } },
  { muscle: 'schultern', shape: { kind: 'circle', cx: 30, cy: 34, r: 7 } },
  { muscle: 'schultern', shape: { kind: 'circle', cx: 70, cy: 34, r: 7 } },
  { muscle: 'ruecken', shape: { kind: 'rect', x: 36, y: 29, w: 28, h: 30, r: 6 } },
  { muscle: 'ruecken', shape: { kind: 'rect', x: 40, y: 61, w: 20, h: 13, r: 4 } },
  { muscle: 'arme', shape: { kind: 'rect', x: 21, y: 42, w: 9, h: 30, r: 4 } },
  { muscle: 'arme', shape: { kind: 'rect', x: 70, y: 42, w: 9, h: 30, r: 4 } },
  { muscle: 'po', shape: { kind: 'rect', x: 37, y: 76, w: 12, h: 13, r: 5 } },
  { muscle: 'po', shape: { kind: 'rect', x: 51, y: 76, w: 12, h: 13, r: 5 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 36, y: 91, w: 12, h: 29, r: 5 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 52, y: 91, w: 12, h: 29, r: 5 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 37, y: 123, w: 10, h: 24, r: 4 } },
  { muscle: 'beine', shape: { kind: 'rect', x: 53, y: 123, w: 10, h: 24, r: 4 } },
];

export function BodyMap({ stats }: { stats: Record<MuscleGroup, MuscleStat> }) {
  const { colors } = useTheme();
  const OPACITY = [0, 0.3, 0.6, 1];
  const fillFor = (m: MuscleGroup | null) => (m ? intensity(stats[m].sets) : -1);

  const figure = (parts: typeof FRONT, label: string, dx: number) => (
    <G x={dx}>
      {parts.map((p, i) => {
        const lvl = fillFor(p.muscle);
        const fill = lvl <= 0 ? colors.track : colors.primary;
        const opacity = lvl <= 0 ? 1 : OPACITY[lvl];
        return p.shape.kind === 'circle' ? (
          <Circle key={i} cx={p.shape.cx} cy={p.shape.cy} r={p.shape.r} fill={fill} opacity={opacity} stroke={colors.card} strokeWidth={1} />
        ) : (
          <Rect key={i} x={p.shape.x} y={p.shape.y} width={p.shape.w} height={p.shape.h} rx={p.shape.r ?? 3} fill={fill} opacity={opacity} stroke={colors.card} strokeWidth={1} />
        );
      })}
      <SvgText x={50} y={160} fontSize={9} fill={colors.textSecondary} textAnchor="middle">
        {label}
      </SvgText>
    </G>
  );

  return (
    <View style={{ alignItems: 'center', gap: 8 }} accessibilityLabel="Körperkarte der trainierten Muskelgruppen">
      <Svg width="100%" height={230} viewBox="0 0 220 165">
        {figure(FRONT, 'Vorne', 5)}
        {figure(BACK, 'Hinten', 115)}
      </Svg>
      <Row gap={12} wrap justify="center">
        {['0 Sätze', '1–5', '6–11', '12+'].map((l, i) => (
          <Row key={l} gap={4}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: i === 0 ? colors.track : colors.primary, opacity: i === 0 ? 1 : OPACITY[i] }} />
            <Txt variant="caption">{l}</Txt>
          </Row>
        ))}
      </Row>
    </View>
  );
}

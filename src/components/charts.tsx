import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { clamp, formatNumber } from '../lib/calc';
import { useTheme } from '../lib/theme';
import { Txt } from './ui';

export function ProgressRing({
  size = 160,
  stroke = 14,
  progress,
  color,
  trackColor,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(progress, 0, 1);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? colors.track} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color ?? colors.primary}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

function useWidth(initial = 320) {
  const [w, setW] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => {
    const nw = Math.round(e.nativeEvent.layout.width);
    if (nw > 0 && Math.abs(nw - w) > 1) setW(nw);
  };
  return { w, onLayout };
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

export interface BarDatum {
  label: string;
  value: number;
  /** optional detail shown on selection */
  detail?: string;
}

/** Single-series bar chart with optional goal line; tap a bar to see its value */
export function BarChart({
  data,
  goal,
  height = 180,
  color,
  overColor,
  unit = '',
  goalLabel = 'Ziel',
  testID,
}: {
  data: BarDatum[];
  goal?: number;
  height?: number;
  color?: string;
  overColor?: string;
  unit?: string;
  goalLabel?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const padL = 40;
  const padB = 22;
  const padT = 10;
  const chartH = height - padB - padT;
  const maxV = niceMax(Math.max(goal ?? 0, ...data.map((d) => d.value)) * 1.05);
  const n = Math.max(1, data.length);
  const slot = (w - padL) / n;
  const barW = Math.max(4, Math.min(28, slot - 6));
  const y = (v: number) => padT + chartH - (v / maxV) * chartH;
  const ticks = [0, maxV / 2, maxV];
  const showEvery = n > 14 ? Math.ceil(n / 7) : 1;

  const selected = sel != null ? data[sel] : null;

  return (
    <View onLayout={onLayout} testID={testID}>
      <View style={{ minHeight: 22, marginBottom: 4 }}>
        {selected ? (
          <Txt variant="small" bold>
            {selected.label}: {formatNumber(selected.value)} {unit}
            {selected.detail ? ` · ${selected.detail}` : ''}
          </Txt>
        ) : (
          <Txt variant="caption">Tippe auf einen Balken für Details</Txt>
        )}
      </View>
      <Svg width={w} height={height}>
        {ticks.map((t, i) => (
          <G key={i}>
            <Line x1={padL} x2={w} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
            <SvgText x={padL - 6} y={y(t) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
              {formatNumber(t)}
            </SvgText>
          </G>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const h = Math.max(d.value > 0 ? 2 : 0, (d.value / maxV) * chartH);
          const isOver = goal != null && goal > 0 && d.value > goal * 1.1;
          const fill = isOver && overColor ? overColor : (color ?? colors.primary);
          const r = Math.min(4, barW / 2, h);
          const top = padT + chartH - h;
          const path =
            h > 0
              ? `M${x},${padT + chartH} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + barW - r},${top} Q${x + barW},${top} ${x + barW},${top + r} L${x + barW},${padT + chartH} Z`
              : '';
          return (
            <G key={i}>
              {h > 0 ? <Path d={path} fill={fill} opacity={sel == null || sel === i ? 1 : 0.45} /> : null}
              {i % showEvery === 0 ? (
                <SvgText x={x + barW / 2} y={height - 6} fontSize={10} fill={colors.muted} textAnchor="middle">
                  {d.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
        {goal != null && goal > 0 ? (
          <G>
            <Line x1={padL} x2={w} y1={y(goal)} y2={y(goal)} stroke={colors.text} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />
            <SvgText x={w - 2} y={y(goal) - 4} fontSize={10} fill={colors.textSecondary} textAnchor="end">
              {goalLabel} {formatNumber(goal)}
            </SvgText>
          </G>
        ) : null}
      </Svg>
      {/* hit targets larger than marks */}
      <View style={{ position: 'absolute', left: padL, right: 0, top: 26, height: chartH + padT, flexDirection: 'row' }}>
        {data.map((d, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`${d.label}: ${formatNumber(d.value)} ${unit}`}
            style={{ flex: 1 }}
            onPress={() => setSel(sel === i ? null : i)}
          />
        ))}
      </View>
    </View>
  );
}

export interface LinePoint {
  label: string;
  value: number;
}

/** Single-series line chart with optional target line; tap to inspect points */
export function LineChart({
  data,
  target,
  height = 190,
  color,
  unit = '',
  decimals = 1,
  testID,
}: {
  data: LinePoint[];
  target?: number;
  height?: number;
  color?: string;
  unit?: string;
  decimals?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const padL = 40;
  const padR = 10;
  const padB = 22;
  const padT = 12;
  const chartH = height - padB - padT;
  const values = data.map((d) => d.value);
  if (target != null) values.push(target);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (!isFinite(min) || !isFinite(max)) {
    min = 0;
    max = 1;
  }
  const span = Math.max(1, max - min);
  min = Math.floor(min - span * 0.15);
  max = Math.ceil(max + span * 0.15);
  const innerW = w - padL - padR;
  const x = (i: number) => padL + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => padT + chartH - ((v - min) / (max - min)) * chartH;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const lineColor = color ?? colors.primary;
  const selected = sel != null ? data[sel] : null;

  return (
    <View onLayout={onLayout} testID={testID}>
      <View style={{ minHeight: 22, marginBottom: 4 }}>
        {selected ? (
          <Txt variant="small" bold>
            {selected.label}: {formatNumber(selected.value, decimals)} {unit}
          </Txt>
        ) : (
          <Txt variant="caption">Tippe auf das Diagramm für Details</Txt>
        )}
      </View>
      <Svg width={w} height={height}>
        {ticks.map((t, i) => (
          <G key={i}>
            <Line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
            <SvgText x={padL - 6} y={y(t) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
              {formatNumber(t, 0)}
            </SvgText>
          </G>
        ))}
        {target != null ? (
          <G>
            <Line x1={padL} x2={w - padR} y1={y(target)} y2={y(target)} stroke={colors.text} strokeDasharray="5 4" strokeWidth={1.5} opacity={0.55} />
            <SvgText x={w - padR} y={y(target) - 4} fontSize={10} fill={colors.textSecondary} textAnchor="end">
              Ziel {formatNumber(target, decimals)}
            </SvgText>
          </G>
        ) : null}
        {data.length > 1 ? <Path d={path} stroke={lineColor} strokeWidth={2} fill="none" strokeLinejoin="round" /> : null}
        {sel != null && data[sel] ? (
          <Line x1={x(sel)} x2={x(sel)} y1={padT} y2={padT + chartH} stroke={colors.muted} strokeWidth={1} />
        ) : null}
        {data.map((d, i) =>
          data.length <= 31 || i === sel || i === data.length - 1 ? (
            <Circle key={i} cx={x(i)} cy={y(d.value)} r={sel === i ? 6 : 4} fill={lineColor} stroke={colors.card} strokeWidth={2} />
          ) : null,
        )}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <SvgText key={`l${i}`} x={x(i)} y={height - 6} fontSize={10} fill={colors.muted} textAnchor="middle">
              {d.label}
            </SvgText>
          ) : null,
        )}
        <Rect x={0} y={0} width={0} height={0} />
      </Svg>
      <View style={{ position: 'absolute', left: padL - 8, right: padR - 8, top: 26, height: chartH + padT, flexDirection: 'row' }}>
        {data.map((d, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`${d.label}: ${formatNumber(d.value, decimals)} ${unit}`}
            style={{ flex: 1 }}
            onPress={() => setSel(sel === i ? null : i)}
          />
        ))}
      </View>
    </View>
  );
}

/** Horizontal stacked macro bar with direct labels underneath */
export function MacroSplitBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const { colors } = useTheme();
  const pk = protein * 4;
  const ck = carbs * 4;
  const fk = fat * 9;
  const total = pk + ck + fk;
  const segs = [
    { label: 'Eiweiß', kcal: pk, color: colors.protein },
    { label: 'Kohlenhydrate', kcal: ck, color: colors.carbs },
    { label: 'Fett', kcal: fk, color: colors.fat },
  ];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.track, gap: 2 }}>
        {total > 0
          ? segs.map((s) => (s.kcal > 0 ? <View key={s.label} style={{ flex: s.kcal, backgroundColor: s.color }} /> : null))
          : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {segs.map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Txt variant="caption">
              {s.label} {total > 0 ? Math.round((s.kcal / total) * 100) : 0} %
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

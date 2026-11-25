import { Column, LinearProgressIndicator, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { FitWidgetProps } from './types';

const FitWidget = (props: FitWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const BG = dark ? '#1a1a19' : '#ffffff';
  const FG = dark ? '#f0efec' : '#0b0b0b';
  const MUTED = dark ? '#c3c2b7' : '#52514e';
  const GREEN = '#16a34a';
  const TRACK = dark ? '#2a2a28' : '#e8e9e4';
  const items = props.items as unknown as Record<string, FitWidgetProps['items']['kcal']>;

  if (props.metric === 'overview') {
    const rows = ['kcal', 'steps', 'water', 'protein'].map((k) => ({ k, v: items[k] }));
    return (
      <Column verticalArrangement={{ spacedBy: 6 }} modifiers={[fillMaxSize(), background(BG), cornerRadius(20), paddingAll(12)]}>
        <Text color={GREEN} style={{ fontSize: 13, fontWeight: 'bold' }}>
          FitLife · {props.updated}
        </Text>
        {rows.map((r) => (
          <Column key={r.k} verticalArrangement={{ spacedBy: 2 }} modifiers={[fillMaxWidth()]}>
            <Text color={FG} style={{ fontSize: 12, fontWeight: '600' }}>
              {r.v.emoji} {r.v.value} {r.v.label}
            </Text>
            <LinearProgressIndicator progress={Math.min(1, r.v.progress)} color={GREEN} trackColor={TRACK} modifiers={[fillMaxWidth(), height(4)]} />
          </Column>
        ))}
      </Column>
    );
  }

  const item = items[props.metric] ?? items.kcal;
  return (
    <Column verticalArrangement={{ spacedBy: 4 }} modifiers={[fillMaxSize(), background(BG), cornerRadius(20), paddingAll(14)]}>
      <Text color={MUTED} style={{ fontSize: 11 }}>
        {item.emoji} FitLife · {props.updated}
      </Text>
      <Text color={FG} style={{ fontSize: 30, fontWeight: 'bold' }}>
        {item.value}
      </Text>
      <Text color={FG} style={{ fontSize: 13, fontWeight: '500' }}>
        {item.label}
      </Text>
      <Text color={MUTED} style={{ fontSize: 11 }}>
        {item.sub}
      </Text>
      <LinearProgressIndicator progress={Math.min(1, item.progress)} color={GREEN} trackColor={TRACK} modifiers={[fillMaxWidth(), height(6)]} />
    </Column>
  );
};

export default createWidget<FitWidgetProps>('FitWidget', FitWidget);

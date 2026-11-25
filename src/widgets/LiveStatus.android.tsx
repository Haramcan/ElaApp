import { Column, LinearProgressIndicator, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, height } from '@expo/ui/jetpack-compose/modifiers';
import { createCustomNotification } from 'expo-widgets';

import type { LiveStatusProps } from './types';

/** Android: ongoing notification with live progress (the counterpart of the iPhone Dynamic Island) */
export default createCustomNotification<LiveStatusProps>('LiveStatus', (props, environment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const FG = dark ? '#f0efec' : '#0b0b0b';
  const MUTED = dark ? '#c3c2b7' : '#52514e';
  const GREEN = '#16a34a';
  const TRACK = dark ? '#2a2a28' : '#e8e9e4';
  return {
    collapsed: (
      <Column verticalArrangement={{ spacedBy: 4 }} modifiers={[fillMaxWidth()]}>
        <Text color={FG} style={{ fontSize: 14, fontWeight: 'bold' }}>
          {props.emoji} {props.title}: {props.value}
        </Text>
        <LinearProgressIndicator progress={Math.min(1, props.progress)} color={GREEN} trackColor={TRACK} modifiers={[fillMaxWidth(), height(4)]} />
      </Column>
    ),
    expanded: (
      <Column verticalArrangement={{ spacedBy: 6 }} modifiers={[fillMaxWidth()]}>
        <Text color={FG} style={{ fontSize: 15, fontWeight: 'bold' }}>
          {props.emoji} {props.title}
        </Text>
        <Text color={FG} style={{ fontSize: 22, fontWeight: 'bold' }}>
          {props.value}
        </Text>
        <Text color={MUTED} style={{ fontSize: 12 }}>
          {props.sub}
        </Text>
        <LinearProgressIndicator progress={Math.min(1, props.progress)} color={GREEN} trackColor={TRACK} modifiers={[fillMaxWidth(), height(6)]} />
      </Column>
    ),
  };
});

import { Gauge, HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, gaugeStyle, lineLimit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { LiveStatusProps } from './types';

/** iPhone Dynamic Island + Lock Screen */
const LiveStatus = (props: LiveStatusProps, environment: LiveActivityEnvironment) => {
  'widget';
  const GREEN = environment.isLuminanceReduced ? '#FFFFFF' : '#22c55e';
  const hasTimer = props.timerStart != null && props.timerEnd != null && props.timerEnd > props.timerStart;
  const timer = hasTimer ? (
    <Text timerInterval={{ lower: new Date(props.timerStart as number), upper: new Date(props.timerEnd as number) }} countsDown={!!props.countdown} modifiers={[font({ weight: 'bold', size: 15 })]} />
  ) : null;
  const value = timer ?? <Text modifiers={[font({ weight: 'bold', size: 15 }), lineLimit(1)]}>{props.value}</Text>;

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 14 })]}>
        <Image systemName={props.symbol as never} color={GREEN} />
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ weight: 'semibold', size: 14 })]}>{props.title}</Text>
          {hasTimer ? (
            <Text timerInterval={{ lower: new Date(props.timerStart as number), upper: new Date(props.timerEnd as number) }} countsDown={!!props.countdown} modifiers={[font({ weight: 'bold', size: 22 })]} />
          ) : (
            <Text modifiers={[font({ weight: 'bold', size: 22 })]}>{props.value}</Text>
          )}
          <Text modifiers={[font({ size: 12 }), foregroundStyle('secondary' as never)]}>{props.sub}</Text>
          <Gauge value={Math.min(1, props.progress)} modifiers={[gaugeStyle('linearCapacity'), tint(GREEN)]} />
        </VStack>
      </HStack>
    ),
    compactLeading: <Image systemName={props.symbol as never} color={GREEN} />,
    compactTrailing: value,
    minimal: (
      <Gauge value={Math.min(1, props.progress)} modifiers={[gaugeStyle('circular'), tint(GREEN)]}>
        <Image systemName={props.symbol as never} />
      </Gauge>
    ),
    expandedLeading: (
      <VStack alignment="leading" modifiers={[padding({ all: 8 })]}>
        <Image systemName={props.symbol as never} color={GREEN} />
        <Text modifiers={[font({ size: 12 })]}>{props.title}</Text>
      </VStack>
    ),
    expandedTrailing: <VStack modifiers={[padding({ all: 8 })]}>{value}</VStack>,
    expandedBottom: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ horizontal: 8, bottom: 8 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('secondary' as never)]}>{props.sub}</Text>
        <Gauge value={Math.min(1, props.progress)} modifiers={[gaugeStyle('linearCapacity'), tint(GREEN)]} />
      </VStack>
    ),
  };
};

export default createLiveActivity<LiveStatusProps>('LiveStatus', LiveStatus);

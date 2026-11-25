import { Gauge, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, gaugeStyle, lineLimit, minimumScaleFactor, padding, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { PlatformColor } from 'react-native';

import type { FitWidgetProps } from './types';

type Config = { metric: string };

const FitWidget = (props: FitWidgetProps, environment: WidgetEnvironment<Config>) => {
  'widget';
  const GREEN = '#22c55e';
  const chosen = environment.configuration?.metric && environment.configuration.metric !== 'app' ? environment.configuration.metric : props.metric;
  const keys = ['kcal', 'steps', 'water', 'protein', 'challenge'];
  const key = keys.includes(chosen) ? chosen : 'kcal';
  const item = (props.items as unknown as Record<string, FitWidgetProps['items']['kcal']>)[key];
  const bg = containerBackground(PlatformColor('systemBackground'), 'widget');
  const family = environment.widgetFamily;

  if (family === 'accessoryCircular') {
    return (
      <Gauge value={Math.min(1, item.progress)} modifiers={[gaugeStyle('circular'), bg, widgetURL('fitlife://')]} currentValueLabel={<Text>{item.value}</Text>}>
        <Image systemName={item.symbol as never} />
      </Gauge>
    );
  }
  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[bg]}>
        {item.value} {item.label}
      </Text>
    );
  }
  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" modifiers={[bg, widgetURL('fitlife://')]}>
        <Text modifiers={[font({ weight: 'bold', size: 15 })]}>
          {item.value} {item.label}
        </Text>
        <Text modifiers={[font({ size: 12 })]}>{item.sub}</Text>
        <Gauge value={Math.min(1, item.progress)} modifiers={[gaugeStyle('linearCapacity')]} />
      </VStack>
    );
  }

  const overview = chosen === 'overview' || family === 'systemMedium' || family === 'systemLarge';
  if (overview) {
    const order = family === 'systemSmall' ? ['kcal', 'steps', 'water'] : ['kcal', 'steps', 'water', 'protein', 'challenge'];
    const rows = order.map((k) => ({ k, v: (props.items as unknown as Record<string, FitWidgetProps['items']['kcal']>)[k] }));
    return (
      <VStack alignment="leading" spacing={family === 'systemSmall' ? 4 : 6} modifiers={[bg, padding({ all: 2 }), widgetURL('fitlife://')]}>
        <HStack>
          <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(GREEN)]}>FitLife</Text>
          <Spacer />
          <Text modifiers={[font({ size: 10 }), foregroundStyle('secondary' as never)]}>{props.updated}</Text>
        </HStack>
        {rows.map((r) => (
          <VStack key={r.k} alignment="leading" spacing={2}>
            <HStack spacing={4}>
              <Image systemName={r.v.symbol as never} modifiers={[font({ size: 11 }), foregroundStyle(GREEN)]} />
              <Text modifiers={[font({ weight: 'semibold', size: 12 }), lineLimit(1), minimumScaleFactor(0.7)]}>
                {r.v.value} {r.v.label}
              </Text>
            </HStack>
            <Gauge value={Math.min(1, r.v.progress)} modifiers={[gaugeStyle('linearCapacity'), tint(GREEN)]} />
          </VStack>
        ))}
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[bg, widgetURL('fitlife://')]}>
      <HStack>
        <Image systemName={item.symbol as never} modifiers={[foregroundStyle(GREEN)]} />
        <Spacer />
        <Text modifiers={[font({ size: 10 }), foregroundStyle('secondary' as never)]}>{props.updated}</Text>
      </HStack>
      <Spacer />
      <Text modifiers={[font({ weight: 'bold', size: 30 }), lineLimit(1), minimumScaleFactor(0.5)]}>{item.value}</Text>
      <Text modifiers={[font({ weight: 'medium', size: 13 })]}>{item.label}</Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle('secondary' as never), lineLimit(1)]}>{item.sub}</Text>
      <Gauge value={Math.min(1, item.progress)} modifiers={[gaugeStyle('linearCapacity'), tint(GREEN)]} />
    </VStack>
  );
};

export default createWidget<FitWidgetProps, Config>('FitWidget', FitWidget);

import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';

import { Icon } from '../../components/ui';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const { state } = useStore();
  const { colors } = useTheme();

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Heute', tabBarIcon: ({ color, size }) => <Icon name="home-variant" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Ernährung', tabBarIcon: ({ color, size }) => <Icon name="food-apple" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="training"
        options={{ title: 'Training', tabBarIcon: ({ color, size }) => <Icon name="dumbbell" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Fortschritt', tabBarIcon: ({ color, size }) => <Icon name="chart-line" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'Mehr', tabBarIcon: ({ color, size }) => <Icon name="cog" color={color} size={size} /> }}
      />
    </Tabs>
  );
}

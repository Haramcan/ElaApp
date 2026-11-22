import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppEffects } from '../components/AppEffects';
import { ToastProvider } from '../components/Toast';
import { StoreProvider, useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemedApp />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { ready } = useStore();
  const { colors, isDark } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <ToastProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AppEffects />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
            headerShadowVisible: false,
            headerBackTitle: 'Zurück',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="scan" options={{ title: 'Barcode scannen', presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="food/search" options={{ title: 'Lebensmittel hinzufügen' }} />
          <Stack.Screen name="food/add" options={{ title: 'Portion wählen' }} />
          <Stack.Screen name="food/custom" options={{ title: 'Eigenes Lebensmittel' }} />
          <Stack.Screen name="food/quick" options={{ title: 'Schnell-Eintrag' }} />
          <Stack.Screen name="food/entry" options={{ title: 'Eintrag bearbeiten' }} />
          <Stack.Screen name="food/my-foods" options={{ title: 'Meine Lebensmittel' }} />
          <Stack.Screen name="workout/log" options={{ title: 'Aktivität eintragen' }} />
          <Stack.Screen name="workout/session" options={{ title: 'Workout', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="workout/plan" options={{ title: 'Workout' }} />
          <Stack.Screen name="challenge" options={{ title: 'Tages-Challenges' }} />
          <Stack.Screen name="weight" options={{ title: 'Gewicht & Maße' }} />
          <Stack.Screen name="fasting" options={{ title: 'Intervallfasten' }} />
          <Stack.Screen name="achievements" options={{ title: 'Erfolge' }} />
          <Stack.Screen name="history" options={{ title: 'Verlauf' }} />
          <Stack.Screen name="settings/profile" options={{ title: 'Profil' }} />
          <Stack.Screen name="settings/goals" options={{ title: 'Ziele' }} />
          <Stack.Screen name="settings/reminders" options={{ title: 'Erinnerungen' }} />
          <Stack.Screen name="settings/reminder-edit" options={{ title: 'Erinnerung bearbeiten' }} />
          <Stack.Screen name="settings/challenges" options={{ title: 'Challenges verwalten' }} />
          <Stack.Screen name="settings/app" options={{ title: 'App-Einstellungen' }} />
          <Stack.Screen name="settings/data" options={{ title: 'Daten & Backup' }} />
          <Stack.Screen name="settings/about" options={{ title: 'Info & Hilfe' }} />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}

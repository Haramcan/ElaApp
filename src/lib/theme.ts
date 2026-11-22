import { useColorScheme } from 'react-native';

import { useStore } from './store';

export const lightColors = {
  bg: '#f4f5f2',
  card: '#ffffff',
  cardAlt: '#f0f1ed',
  text: '#0b0b0b',
  textSecondary: '#52514e',
  muted: '#7a7974',
  border: '#e3e3de',
  primary: '#15803d',
  primarySoft: '#dcfce7',
  onPrimary: '#ffffff',
  danger: '#c62828',
  dangerSoft: '#fde8e8',
  warning: '#b45309',
  warningSoft: '#fef3c7',
  success: '#15803d',
  water: '#2a78d6',
  waterSoft: '#e0edfb',
  protein: '#2a78d6',
  carbs: '#eb6834',
  fat: '#1baf7a',
  track: '#e8e9e4',
  overlay: 'rgba(0,0,0,0.45)',
  fire: '#eb6834',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  bg: '#0f0f0e',
  card: '#1a1a19',
  cardAlt: '#232322',
  text: '#f0efec',
  textSecondary: '#c3c2b7',
  muted: '#8f8e86',
  border: '#2e2e2c',
  primary: '#22c55e',
  primarySoft: '#173a24',
  onPrimary: '#06210f',
  danger: '#ef5350',
  dangerSoft: '#3b1717',
  warning: '#f0a020',
  warningSoft: '#3a2a0c',
  success: '#22c55e',
  water: '#3987e5',
  waterSoft: '#16283f',
  protein: '#3987e5',
  carbs: '#d95926',
  fat: '#199e70',
  track: '#2a2a28',
  overlay: 'rgba(0,0,0,0.6)',
  fire: '#d95926',
};

export function useTheme() {
  const scheme = useColorScheme();
  const { state } = useStore();
  const mode = state.settings.theme;
  const isDark = mode === 'dark' || (mode === 'system' && scheme === 'dark');
  return { colors: isDark ? darkColors : lightColors, isDark };
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

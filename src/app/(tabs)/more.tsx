import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Card, Divider, ListItem, Row, Screen, Txt } from '../../components/ui';
import { ACTIVITY_LABELS, energyValue, formatNumber, formatWeight } from '../../lib/calc';
import { latestWeightKg } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function More() {
  const { state } = useStore();
  const { colors } = useTheme();
  const p = state.profile;
  const remindersOn = state.reminders.filter((r) => r.enabled).length;
  const goalLabel = p.goal === 'lose' ? 'Abnehmen' : p.goal === 'gain' ? 'Zunehmen' : 'Gewicht halten';

  const groups: { title: string; items: { title: string; subtitle?: string; icon: string; href: string; testID?: string }[] }[] = [
    {
      title: 'Persönlich',
      items: [
        { title: 'Profil', subtitle: `${formatWeight(latestWeightKg(state), state.settings.weightUnit)} · ${p.heightCm} cm · ${ACTIVITY_LABELS[p.activity].title}`, icon: 'account', href: '/settings/profile', testID: 'more-profile' },
        { title: 'Ziele', subtitle: `${goalLabel} · ${formatNumber(energyValue(state.goals.calories, state.settings.energyUnit))} ${state.settings.energyUnit}`, icon: 'target', href: '/settings/goals', testID: 'more-goals' },
        { title: 'Erinnerungen', subtitle: `${remindersOn} aktiv`, icon: 'bell-ring-outline', href: '/settings/reminders', testID: 'more-reminders' },
        { title: 'Challenges verwalten', subtitle: `${state.challenges.filter((c) => c.enabled).length} aktiv`, icon: 'arm-flex', href: '/settings/challenges', testID: 'more-challenges' },
      ],
    },
    {
      title: 'Funktionen',
      items: [
        { title: 'Krafttraining & Trainingspläne', subtitle: `${state.gym.plans.length} Pläne · ${state.gym.sessions.length} Trainings`, icon: 'weight-lifter', href: '/gym' },
        { title: 'Intervallfasten', subtitle: state.fasting.active ? 'Läuft gerade' : `${state.fasting.targetHours}:${24 - state.fasting.targetHours}`, icon: 'timer-sand', href: '/fasting' },
        { title: 'Gewicht & Maße', icon: 'scale-bathroom', href: '/weight' },
        { title: 'Meine Lebensmittel', subtitle: `${state.customFoods.length} eigene · ${state.favorites.length} Favoriten`, icon: 'food-apple-outline', href: '/food/my-foods' },
        { title: 'Erfolge', icon: 'trophy-outline', href: '/achievements' },
        { title: 'Tagesverlauf', icon: 'calendar-month', href: '/history' },
      ],
    },
    {
      title: 'App',
      items: [
        { title: 'App-Einstellungen', subtitle: 'Design, Einheiten, Haptik, Workout', icon: 'tune', href: '/settings/app', testID: 'more-app' },
        { title: 'Daten & Backup', subtitle: 'Export, Import, Zurücksetzen', icon: 'database-outline', href: '/settings/data', testID: 'more-data' },
        { title: 'Info & Hilfe', icon: 'information-outline', href: '/settings/about' },
      ],
    },
  ];

  return (
    <Screen>
      <Txt variant="title">Mehr</Txt>
      <Card onPress={() => router.push('/settings/profile')}>
        <Row gap={14}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Txt variant="h1" color={colors.onPrimary}>
              {(p.name || '?').slice(0, 1).toUpperCase()}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h2">{p.name || 'Dein Profil'}</Txt>
            <Txt variant="small">
              {goalLabel} · Ziel {formatWeight(p.targetWeightKg, state.settings.weightUnit)}
            </Txt>
          </View>
        </Row>
      </Card>
      {groups.map((g) => (
        <View key={g.title} style={{ gap: 8 }}>
          <Txt variant="label" style={{ marginTop: 8 }}>
            {g.title}
          </Txt>
          <Card padded={false} style={{ paddingHorizontal: 14 }}>
            {g.items.map((it, i) => (
              <React.Fragment key={it.title}>
                {i > 0 ? <Divider /> : null}
                <ListItem title={it.title} subtitle={it.subtitle} icon={it.icon} iconColor={colors.primary} chevron onPress={() => router.push(it.href as never)} testID={it.testID} />
              </React.Fragment>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

import React from 'react';
import { Platform } from 'react-native';

import { Card, Row, Screen, Segmented, Stepper, SwitchRow, Txt } from '../../components/ui';
import { useStore } from '../../lib/store';

export default function AppSettings() {
  const { state, actions } = useStore();
  const s = state.settings;
  const set = actions.updateSettings;

  return (
    <Screen edges={['bottom']}>
      <Txt variant="label">Darstellung</Txt>
      <Card style={{ gap: 12 }}>
        <Txt bold>Design</Txt>
        <Segmented
          testIDPrefix="theme"
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Hell' },
            { value: 'dark', label: 'Dunkel' },
          ]}
          value={s.theme}
          onChange={(v) => set({ theme: v })}
        />
        <Txt bold>Energieeinheit</Txt>
        <Segmented
          options={[
            { value: 'kcal', label: 'kcal' },
            { value: 'kJ', label: 'kJ' },
          ]}
          value={s.energyUnit}
          onChange={(v) => set({ energyUnit: v })}
        />
        <Txt bold>Gewichtseinheit</Txt>
        <Segmented
          options={[
            { value: 'kg', label: 'Kilogramm' },
            { value: 'lb', label: 'Pfund (lb)' },
          ]}
          value={s.weightUnit}
          onChange={(v) => set({ weightUnit: v })}
        />
        <Txt bold>Wochenbeginn</Txt>
        <Segmented
          options={[
            { value: 'mo', label: 'Montag' },
            { value: 'su', label: 'Sonntag' },
          ]}
          value={s.weekStartsMonday ? 'mo' : 'su'}
          onChange={(v) => set({ weekStartsMonday: v === 'mo' })}
        />
      </Card>

      <Txt variant="label">Ernährung</Txt>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <SwitchRow
          title="Trainingskalorien gutschreiben"
          subtitle="Verbrannte Kalorien erhöhen dein Tagesbudget"
          value={s.eatBackExercise}
          onChange={(v) => set({ eatBackExercise: v })}
          icon="fire"
        />
        {s.eatBackExercise ? (
          <Row justify="space-between" style={{ paddingBottom: 12 }}>
            <Txt variant="small">Anteil gutschreiben</Txt>
            <Stepper value={s.eatBackPercent} onChange={(v) => set({ eatBackPercent: v })} step={10} min={10} max={100} format={(v) => `${v} %`} label="Anteil" />
          </Row>
        ) : null}
        <SwitchRow title="Nutri-Score anzeigen" value={s.showNutriScore} onChange={(v) => set({ showNutriScore: v })} icon="alpha-a-box" />
      </Card>

      <Txt variant="label">Wasser</Txt>
      <Card style={{ gap: 12 }}>
        <Row justify="space-between">
          <Txt>Glasgröße</Txt>
          <Stepper value={s.glassSizeMl} onChange={(v) => set({ glassSizeMl: v })} step={50} min={100} max={1000} format={(v) => `${v} ml`} label="Glasgröße" />
        </Row>
        <Row justify="space-between">
          <Txt>Flaschengröße</Txt>
          <Stepper value={s.bottleSizeMl} onChange={(v) => set({ bottleSizeMl: v })} step={50} min={200} max={2000} format={(v) => `${v} ml`} label="Flaschengröße" />
        </Row>
      </Card>

      <Txt variant="label">Training</Txt>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <Row justify="space-between" style={{ paddingVertical: 10 }}>
          <Txt>Standard-Belastung</Txt>
          <Stepper value={s.workoutWorkSec} onChange={(v) => set({ workoutWorkSec: v })} step={5} min={10} max={120} format={(v) => `${v} s`} label="Belastung" />
        </Row>
        <Row justify="space-between" style={{ paddingVertical: 10 }}>
          <Txt>Pause zwischen Übungen</Txt>
          <Stepper value={s.workoutRestSec} onChange={(v) => set({ workoutRestSec: v })} step={5} min={0} max={120} format={(v) => `${v} s`} label="Pause" />
        </Row>
        <SwitchRow title="5-Sekunden-Countdown" subtitle="Vor dem Workout-Start" value={s.countdownBeforeWorkout} onChange={(v) => set({ countdownBeforeWorkout: v })} icon="timer-outline" />
        <SwitchRow title="Bildschirm anlassen" subtitle="Während geführter Workouts" value={s.keepScreenOn} onChange={(v) => set({ keepScreenOn: v })} icon="cellphone-screenshot" />
      </Card>

      <Txt variant="label">Gerät</Txt>
      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        <SwitchRow
          title="Schrittzähler verwenden"
          subtitle={Platform.OS === 'android' ? 'Zählt Schritte, während die App geöffnet ist' : 'Liest die Schritte von heute aus der Bewegungs-App'}
          value={s.usePedometer}
          onChange={(v) => set({ usePedometer: v })}
          icon="shoe-print"
        />
        <SwitchRow title="Haptisches Feedback" subtitle="Vibration bei Aktionen" value={s.haptics} onChange={(v) => set({ haptics: v })} icon="vibrate" />
      </Card>
    </Screen>
  );
}

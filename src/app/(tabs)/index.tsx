import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ProgressRing } from '../../components/charts';
import { Badge, Button, Card, Icon, IconButton, NumberInput, ProgressBar, Row, Screen, SectionHeader, Txt } from '../../components/ui';
import { energyValue, formatNumber, formatWeight } from '../../lib/calc';
import { dateKey, formatDuration, greeting, parseKey } from '../../lib/date';
import { useNow, useToday } from '../../lib/hooks';
import { useHaptics } from '../../lib/platform';
import { challengeProgress, currentStreak, daySummary, latestWeightKg, workoutsThisWeek } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

const TIPS = [
  'Trink vor jeder Mahlzeit ein Glas Wasser – das hilft beim Sättigungsgefühl.',
  'Eiweiß in jeder Mahlzeit hält länger satt und schützt deine Muskeln.',
  '10 Liegestütze zwischendurch bringen mehr, als du denkst. Kleine Schritte zählen!',
  'Schlaf ist Training für deinen Stoffwechsel: 7–9 Stunden sind ideal.',
  'Gemüse zuerst essen: viel Volumen, wenig Kalorien.',
  'Wiege dich immer zur gleichen Zeit – am besten morgens nach dem Aufstehen.',
  'Ein kurzer Spaziergang nach dem Essen stabilisiert den Blutzucker.',
  'Plane deine Snacks – dann greifst du seltener spontan zu Süßem.',
  'Gewicht schwankt täglich um bis zu 1–2 kg. Achte auf den Trend, nicht den Einzelwert.',
  'Treppe statt Aufzug: kleine Alltagsbewegungen summieren sich.',
];

export default function Today() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const today = useToday();
  const s = useMemo(() => daySummary(state, today), [state, today]);
  const cp = useMemo(() => challengeProgress(state, today), [state, today]);
  const streak = useMemo(() => currentStreak(state, today), [state, today]);
  const unit = state.settings.energyUnit;
  const over = s.remaining < 0;
  const [editSteps, setEditSteps] = useState(false);
  const [stepsDraft, setStepsDraft] = useState<number | null>(null);
  const tip = TIPS[parseKey(today).getDate() % TIPS.length];

  const addWater = (ml: number) => {
    haptics.tap();
    const before = s.water;
    actions.addWater(today, ml);
    if (ml > 0 && before < s.waterGoal && before + ml >= s.waterGoal) haptics.success();
  };

  return (
    <Screen>
      <Row justify="space-between" align="flex-start">
        <View style={{ flex: 1 }}>
          <Txt variant="small">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</Txt>
          <Txt variant="h1" numberOfLines={1}>
            {greeting()}
            {state.profile.name ? `, ${state.profile.name}` : ''}!
          </Txt>
        </View>
        <Pressable onPress={() => router.push('/achievements')} accessibilityRole="button" accessibilityLabel={`Serie: ${streak} Tage`}>
          <Row gap={4} style={{ backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}>
            <Icon name="fire" size={18} color={streak > 0 ? colors.fire : colors.muted} />
            <Txt bold testID="streak">{streak}</Txt>
          </Row>
        </Pressable>
      </Row>

      {/* Calories */}
      <Card testID="calorie-card" onPress={() => router.push('/nutrition')}>
        <Row gap={16}>
          <ProgressRing size={148} stroke={13} progress={s.goal > 0 ? s.eaten / s.goal : 0} color={over ? colors.danger : colors.primary}>
            <Txt variant="number" testID="kcal-remaining" color={over ? colors.danger : colors.text}>
              {formatNumber(energyValue(Math.abs(s.remaining), unit))}
            </Txt>
            <Txt variant="caption">{over ? `${unit} zu viel` : `${unit} übrig`}</Txt>
          </ProgressRing>
          <View style={{ flex: 1, gap: 10 }}>
            <Stat icon="target" label="Ziel" value={formatNumber(energyValue(s.goal, unit))} />
            <Stat icon="silverware-fork-knife" label="Gegessen" value={formatNumber(energyValue(s.eaten, unit))} />
            <Stat icon="fire" label="Verbrannt" value={formatNumber(energyValue(s.burned, unit))} color={colors.fire} />
          </View>
        </Row>
        <View style={{ gap: 10, marginTop: 16 }}>
          <Macro label="Eiweiß" value={s.protein} goal={s.macroGoals.protein} color={colors.protein} />
          <Macro label="Kohlenhydrate" value={s.carbs} goal={s.macroGoals.carbs} color={colors.carbs} />
          <Macro label="Fett" value={s.fat} goal={s.macroGoals.fat} color={colors.fat} />
        </View>
        {s.bonus > 0 ? (
          <Txt variant="caption" style={{ marginTop: 10 }}>
            Inkl. {formatNumber(energyValue(s.bonus, unit))} {unit} Bonus durch Training ({state.settings.eatBackPercent} %)
          </Txt>
        ) : null}
      </Card>

      {/* Quick actions */}
      <Row gap={10}>
        <QuickAction icon="barcode-scan" label="Scannen" onPress={() => router.push('/scan')} testID="qa-scan" />
        <QuickAction icon="magnify" label="Suchen" onPress={() => router.push('/food/search')} testID="qa-search" />
        <QuickAction icon="lightning-bolt" label="Schnell" onPress={() => router.push('/food/quick')} testID="qa-quick" />
        <QuickAction icon="run" label="Aktivität" onPress={() => router.push('/workout/log')} testID="qa-workout" />
      </Row>

      {/* Water */}
      <Card testID="water-card">
        <Row justify="space-between">
          <Row gap={8}>
            <Icon name="cup-water" color={colors.water} />
            <Txt variant="h3">Wasser</Txt>
          </Row>
          <Txt bold testID="water-amount">
            {formatNumber(s.water / 1000, 2)} / {formatNumber(s.waterGoal / 1000, 2)} l
          </Txt>
        </Row>
        <View style={{ marginVertical: 12 }}>
          <ProgressBar value={s.water} max={s.waterGoal} color={colors.water} height={10} />
        </View>
        <Row gap={8}>
          <IconButton icon="minus" label="Glas entfernen" bg={colors.cardAlt} onPress={() => addWater(-state.settings.glassSizeMl)} disabled={s.water <= 0} testID="water-minus" />
          <Button small title={`+ ${state.settings.glassSizeMl} ml`} variant="soft" onPress={() => addWater(state.settings.glassSizeMl)} full={false} style={{ flex: 1 }} testID="water-glass" />
          <Button small title={`+ ${state.settings.bottleSizeMl} ml`} variant="soft" onPress={() => addWater(state.settings.bottleSizeMl)} full={false} style={{ flex: 1 }} testID="water-bottle" />
        </Row>
        {s.water >= s.waterGoal ? (
          <Txt variant="small" color={colors.success} style={{ marginTop: 8 }}>
            Wasserziel erreicht! 💧
          </Txt>
        ) : null}
      </Card>

      {/* Challenges */}
      <SectionHeader title="Tages-Challenges" action="Alle" onAction={() => router.push('/challenge')} testID="challenges-all" />
      <Card testID="challenge-card">
        {cp.total === 0 ? (
          <Pressable onPress={() => router.push('/settings/challenges')}>
            <Txt variant="small">Keine Challenge aktiv. Tippe, um Challenges wie „10 Liegestütze“ einzurichten.</Txt>
          </Pressable>
        ) : (
          <View style={{ gap: 12 }}>
            {cp.items.map(({ challenge: c, done, complete }) => (
              <Row key={c.id} gap={12}>
                <Pressable
                  onPress={() => router.push({ pathname: '/challenge', params: { id: c.id } })}
                  style={{ flex: 1, gap: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}: ${done} von ${c.target}`}
                >
                  <Row justify="space-between">
                    <Txt bold>
                      {c.target}
                      {c.unit === 'sec' ? ' s' : '×'} {c.name}
                    </Txt>
                    <Txt variant="small" color={complete ? colors.success : colors.textSecondary}>
                      {complete ? 'Geschafft ✓' : `${done}/${c.target}`}
                    </Txt>
                  </Row>
                  <ProgressBar value={done} max={c.target} color={complete ? colors.success : colors.primary} />
                </Pressable>
                <IconButton
                  icon={complete ? 'check' : 'plus'}
                  label={`${c.name} erledigen`}
                  bg={complete ? colors.primarySoft : colors.cardAlt}
                  color={colors.primary}
                  testID={`challenge-done-${c.exerciseId}`}
                  disabled={complete}
                  onPress={() => {
                    actions.setChallengeProgress(today, c.id, c.target);
                    haptics.success();
                  }}
                />
              </Row>
            ))}
            <Txt variant="caption">
              {cp.completed}/{cp.total} erledigt · Tippe auf eine Challenge für Zähler & Timer
            </Txt>
          </View>
        )}
      </Card>

      {/* Steps & workouts */}
      <Row gap={10} align="stretch">
        <Card style={{ flex: 1, gap: 8 }} testID="steps-card" onPress={() => {
          setStepsDraft(s.steps);
          setEditSteps(!editSteps);
        }}>
          <Row gap={6}>
            <Icon name="shoe-print" size={18} color={colors.primary} />
            <Txt variant="small" bold>
              Schritte
            </Txt>
          </Row>
          <Txt variant="h2">{formatNumber(s.steps)}</Txt>
          <ProgressBar value={s.steps} max={s.stepsGoal} />
          <Txt variant="caption">Ziel {formatNumber(s.stepsGoal)}</Txt>
        </Card>
        <Card style={{ flex: 1, gap: 8 }} onPress={() => router.push('/training')}>
          <Row gap={6}>
            <Icon name="dumbbell" size={18} color={colors.primary} />
            <Txt variant="small" bold>
              Trainings
            </Txt>
          </Row>
          <Txt variant="h2">
            {workoutsThisWeek(state, today)}/{state.goals.workoutsPerWeek}
          </Txt>
          <ProgressBar value={workoutsThisWeek(state, today)} max={state.goals.workoutsPerWeek} />
          <Txt variant="caption">diese Woche</Txt>
        </Card>
      </Row>
      {editSteps ? (
        <Card>
          <NumberInput label="Schritte heute" value={stepsDraft} onChange={setStepsDraft} decimals={0} min={0} max={200000} testID="steps-input" />
          <Row gap={8} style={{ marginTop: 10 }}>
            <Button title="Abbrechen" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => setEditSteps(false)} />
            <Button
              title="Speichern"
              full={false}
              style={{ flex: 1 }}
              testID="steps-save"
              disabled={stepsDraft == null || stepsDraft < 0}
              onPress={() => {
                actions.setSteps(today, stepsDraft ?? 0);
                setEditSteps(false);
              }}
            />
          </Row>
          <Txt variant="caption" style={{ marginTop: 8 }}>
            {state.settings.usePedometer ? 'Schritte werden automatisch über den Schrittzähler deines Handys erfasst, wenn verfügbar.' : 'Automatischer Schrittzähler ist in den Einstellungen deaktiviert.'}
          </Txt>
        </Card>
      ) : null}

      {/* Fasting + weight */}
      <Row gap={10} align="stretch">
        <FastingMini />
        <Card style={{ flex: 1, gap: 6 }} onPress={() => router.push('/weight')} testID="weight-card">
          <Row gap={6}>
            <Icon name="scale-bathroom" size={18} color={colors.primary} />
            <Txt variant="small" bold>
              Gewicht
            </Txt>
          </Row>
          <Txt variant="h2">{formatWeight(latestWeightKg(state), state.settings.weightUnit)}</Txt>
          <Txt variant="caption">
            Ziel {formatWeight(state.profile.targetWeightKg, state.settings.weightUnit)}
          </Txt>
          {!state.weights.some((w) => w.date === dateKey()) ? <Badge label="Heute eintragen" /> : null}
        </Card>
      </Row>

      <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Icon name="lightbulb-on-outline" color={colors.warning} />
        <Txt variant="small" style={{ flex: 1 }}>
          {tip}
        </Txt>
      </Card>
    </Screen>
  );
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <Row gap={10}>
      <Icon name={icon} size={18} color={color ?? colors.textSecondary} />
      <View>
        <Txt variant="caption">{label}</Txt>
        <Txt bold>{value}</Txt>
      </View>
    </Row>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Row justify="space-between">
        <Row gap={6}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Txt variant="small">{label}</Txt>
        </Row>
        <Txt variant="small" color={value > goal * 1.1 ? colors.warning : colors.textSecondary}>
          {formatNumber(value)} / {formatNumber(goal)} g
        </Txt>
      </Row>
      <ProgressBar value={value} max={goal} color={color} height={6} />
    </View>
  );
}

function QuickAction({ icon, label, onPress, testID }: { icon: string; label: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={colors.primary} />
      </View>
      <Txt variant="caption" bold>
        {label}
      </Txt>
    </Pressable>
  );
}

function FastingMini() {
  const { state } = useStore();
  const { colors } = useTheme();
  const active = state.fasting.active;
  const now = useNow(30000, !!active);
  const elapsed = active ? now - active.start : 0;
  const target = (active?.targetHours ?? state.fasting.targetHours) * 3600000;
  return (
    <Card style={{ flex: 1, gap: 6 }} onPress={() => router.push('/fasting')} testID="fasting-card">
      <Row gap={6}>
        <Icon name="timer-sand" size={18} color={colors.primary} />
        <Txt variant="small" bold>
          Fasten
        </Txt>
      </Row>
      {active ? (
        <>
          <Txt variant="h2">{formatDuration(elapsed)}</Txt>
          <ProgressBar value={elapsed} max={target} />
          <Txt variant="caption">{elapsed >= target ? 'Ziel erreicht! 🎉' : `Ziel ${active.targetHours} h`}</Txt>
        </>
      ) : (
        <>
          <Txt variant="h2">{state.fasting.targetHours}:{24 - state.fasting.targetHours}</Txt>
          <Txt variant="caption">Tippe zum Starten</Txt>
        </>
      )}
    </Card>
  );
}

import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LastTimeLine } from '../../components/gym';
import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Icon, Input, Row, SwitchRow, Txt } from '../../components/ui';
import { allGymExercises, EQUIPMENT_ICONS, EQUIPMENT_LABELS, MUSCLE_LABELS, newSessionLog, searchGymExercises } from '../../lib/gym';
import { useHaptics } from '../../lib/platform';
import { uid, useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import type { GymEquipment, GymExercise, MuscleGroup } from '../../lib/types';

export default function GymExercises() {
  const params = useLocalSearchParams<{ mode?: string; planId?: string; dayId?: string }>();
  const mode = params.mode === 'session' || params.mode === 'plan' ? params.mode : undefined;
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [creating, setCreating] = useState(false);

  const usedIds = useMemo(() => {
    const ids = new Map<string, number>();
    for (const s of state.gym.sessions) for (const l of s.exercises) ids.set(l.exerciseId, Math.max(ids.get(l.exerciseId) ?? 0, s.start));
    return ids;
  }, [state.gym.sessions]);

  const list = useMemo(() => {
    const found = searchGymExercises(allGymExercises(state), query, muscle);
    // recently used first, then custom, then alphabetical
    return found.sort((a, b) => (usedIds.get(b.id) ?? 0) - (usedIds.get(a.id) ?? 0) || Number(!!b.custom) - Number(!!a.custom) || a.name.localeCompare(b.name, 'de'));
  }, [state, query, muscle, usedIds]);

  const choose = (ex: GymExercise) => {
    if (mode === 'session') {
      if (!state.gym.active) {
        toast('Kein aktives Training');
        return;
      }
      actions.addActiveLog(newSessionLog(state, ex.id, { restSec: state.settings.gymRestSec }));
      haptics.tap();
      toast({ message: `${ex.name} hinzugefügt`, icon: 'check' });
      router.back();
    } else if (mode === 'plan' && params.planId && params.dayId) {
      actions.addPlanExercise(params.planId, params.dayId, ex.id, { restSec: state.settings.gymRestSec });
      haptics.tap();
      toast({ message: `${ex.name} zum Plan hinzugefügt`, icon: 'check' });
      router.back();
    } else {
      router.push({ pathname: '/gym/exercise', params: { id: ex.id } });
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: mode ? 'Übung auswählen' : 'Geräte & Übungen' }} />
      <FlatList
        data={creating ? [] : list}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            {creating ? (
              <CreateExercise
                onCancel={() => setCreating(false)}
                onCreated={(ex) => {
                  setCreating(false);
                  if (mode) choose(ex);
                }}
              />
            ) : (
              <>
                <Input testID="gym-ex-search" placeholder="Gerät oder Übung suchen …" value={query} onChangeText={setQuery} autoCorrect={false} />
                <Row gap={6} wrap>
                  <Chip label="Alle" selected={muscle === 'all'} onPress={() => setMuscle('all')} />
                  {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
                    <Chip key={m} label={MUSCLE_LABELS[m]} selected={muscle === m} onPress={() => setMuscle(m)} testID={`gym-muscle-${m}`} />
                  ))}
                </Row>
                <Button title="Eigenes Gerät / Übung anlegen" icon="plus" variant="soft" small onPress={() => setCreating(true)} testID="gym-ex-create" />
              </>
            )}
          </View>
        }
        renderItem={({ item: e }) => (
          <Pressable
            testID={`gym-ex-${e.id}`}
            accessibilityRole="button"
            onPress={() => choose(e)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={EQUIPMENT_ICONS[e.equipment]} color={colors.primary} size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt bold numberOfLines={2}>
                {e.name}
                {e.custom ? ' ★' : ''}
              </Txt>
              <Txt variant="caption">
                {MUSCLE_LABELS[e.muscle]} · {EQUIPMENT_LABELS[e.equipment]}
              </Txt>
              {usedIds.has(e.id) ? <LastTimeLine exerciseId={e.id} /> : null}
            </View>
            <Icon name={mode ? 'plus-circle' : 'chevron-right'} color={mode ? colors.primary : colors.muted} />
          </Pressable>
        )}
        ListEmptyComponent={
          creating ? undefined : (
            <Txt variant="small" center style={{ paddingVertical: 24 }}>
              Nichts gefunden – lege dein Gerät einfach selbst an.
            </Txt>
          )
        }
      />
    </SafeAreaView>
  );
}

function CreateExercise({ onCancel, onCreated }: { onCancel: () => void; onCreated: (ex: GymExercise) => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('brust');
  const [equipment, setEquipment] = useState<GymEquipment>('maschine');
  const [bodyweight, setBodyweight] = useState(false);
  return (
    <Card style={{ gap: 12 }}>
      <Txt variant="h3">Eigenes Gerät / Übung</Txt>
      <Input testID="gym-new-name" label="Name" value={name} onChangeText={setName} placeholder="z. B. Beinpresse 45° (Gerät 12)" maxLength={50} autoFocus />
      <Txt variant="small" bold>
        Muskelgruppe
      </Txt>
      <Row gap={6} wrap>
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} selected={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </Row>
      <Txt variant="small" bold>
        Art
      </Txt>
      <Row gap={6} wrap>
        {(Object.keys(EQUIPMENT_LABELS) as GymEquipment[]).map((e) => (
          <Chip key={e} label={EQUIPMENT_LABELS[e]} selected={equipment === e} onPress={() => setEquipment(e)} />
        ))}
      </Row>
      <SwitchRow title="Ohne Zusatzgewicht möglich" subtitle="z. B. Klimmzüge, Dips" value={bodyweight} onChange={setBodyweight} />
      <Row gap={10}>
        <Button title="Abbrechen" variant="secondary" full={false} style={{ flex: 1 }} onPress={onCancel} />
        <Button
          title="Speichern"
          full={false}
          style={{ flex: 1 }}
          disabled={name.trim().length === 0}
          testID="gym-new-save"
          onPress={() => {
            const ex: GymExercise = { id: uid('gx_'), name: name.trim(), muscle, equipment, bodyweight, custom: true };
            actions.saveGymExercise(ex);
            toast({ message: `${ex.name} angelegt`, icon: 'check' });
            onCreated(ex);
          }}
        />
      </Row>
    </Card>
  );
}

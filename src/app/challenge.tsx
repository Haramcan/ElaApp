import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useToast } from '../components/Toast';
import { Button, Card, EmptyState, Icon, IconButton, ProgressBar, Row, Screen, Txt } from '../components/ui';
import { formatNumber } from '../lib/calc';
import { lastNDays, weekdayShort } from '../lib/date';
import { getExercise } from '../lib/exercises';
import { useToday } from '../lib/hooks';
import { useHaptics } from '../lib/platform';
import { challengeProgress, totalReps } from '../lib/selectors';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import type { Challenge } from '../lib/types';

export default function Challenges() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { state } = useStore();
  const today = useToday();
  const cp = challengeProgress(state, today);
  const [openId, setOpenId] = useState<string | null>(params.id ?? cp.items.find((i) => !i.complete)?.challenge.id ?? null);
  const { colors } = useTheme();
  const days = lastNDays(7, today);

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: 8 }}>
        <Row justify="space-between">
          <Txt variant="h3">Heute</Txt>
          <Txt bold color={cp.completed === cp.total && cp.total > 0 ? colors.success : colors.text}>
            {cp.completed}/{cp.total} erledigt
          </Txt>
        </Row>
        <ProgressBar value={cp.completed} max={Math.max(1, cp.total)} height={10} />
        <Row justify="space-between" style={{ marginTop: 6 }}>
          {days.map((d) => {
            const p = challengeProgress(state, d);
            const full = p.total > 0 && p.completed === p.total;
            const partial = p.completed > 0 && !full;
            return (
              <View key={d} style={{ alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: full ? colors.primary : partial ? colors.primarySoft : colors.cardAlt,
                    borderWidth: d === today ? 2 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  {full ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
                </View>
                <Txt variant="caption">{weekdayShort(d)}</Txt>
              </View>
            );
          })}
        </Row>
      </Card>

      {cp.items.length === 0 ? (
        <EmptyState icon="arm-flex" title="Keine Challenge aktiv" text="Aktiviere Challenges wie „10 Liegestütze“ und lass dich daran erinnern." />
      ) : null}

      {cp.items.map(({ challenge, done, complete }) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          done={done}
          complete={complete}
          open={openId === challenge.id}
          onToggle={() => setOpenId(openId === challenge.id ? null : challenge.id)}
          lifetime={challenge.unit === 'reps' ? totalReps(state, challenge.exerciseId) : undefined}
        />
      ))}

      <Button title="Challenges verwalten" icon="playlist-edit" variant="secondary" onPress={() => router.push('/settings/challenges')} />
      <Button title="Erinnerungen einstellen" icon="bell-outline" variant="ghost" onPress={() => router.push({ pathname: '/settings/reminder-edit', params: { id: 'rem_challenge' } })} />
    </Screen>
  );
}

function ChallengeCard({
  challenge: c,
  done,
  complete,
  open,
  onToggle,
  lifetime,
}: {
  challenge: Challenge;
  done: number;
  complete: boolean;
  open: boolean;
  onToggle: () => void;
  lifetime?: number;
}) {
  const { actions } = useStore();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const toast = useToast();
  const today = useToday();
  const ex = getExercise(c.exerciseId);
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const startRef = useRef(0);
  const baseRef = useRef(0);
  const wasComplete = useRef(complete);

  useEffect(() => {
    if (complete && !wasComplete.current) {
      haptics.success();
      toast({ message: `${c.name} geschafft! 💪`, icon: 'check-circle' });
    }
    wasComplete.current = complete;
  }, [complete, c.name, haptics, toast]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setSecs(s);
      if (baseRef.current + s >= c.target && baseRef.current < c.target) {
        // target reached while timing – keep running, but give feedback once
        baseRef.current = c.target; // prevents repeat
        haptics.success();
      }
    }, 250);
    return () => clearInterval(t);
  }, [running, c.target, haptics]);

  const add = (n: number) => {
    haptics.tap();
    actions.addChallengeProgress(today, c.id, n);
  };

  const stopTimer = () => {
    setRunning(false);
    const s = Math.floor((Date.now() - startRef.current) / 1000);
    if (s > 0) actions.addChallengeProgress(today, c.id, s);
    setSecs(0);
  };

  return (
    <Card style={{ gap: 12 }} testID={`challenge-${c.exerciseId}`}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Row gap={12}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: complete ? colors.primary : colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={complete ? 'check' : (ex?.icon ?? 'arm-flex')} color={complete ? colors.onPrimary : colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="h3">
              {c.target}
              {c.unit === 'sec' ? ' Sekunden' : '×'} {c.name}
            </Txt>
            <ProgressBar value={done} max={c.target} color={complete ? colors.success : colors.primary} />
          </View>
          <Txt bold testID={`challenge-count-${c.exerciseId}`}>
            {done}/{c.target}
          </Txt>
        </Row>
      </Pressable>

      {open ? (
        <View style={{ gap: 12 }}>
          {ex?.tip ? <Txt variant="small">💡 {ex.tip}</Txt> : null}
          {c.unit === 'reps' ? (
            <>
              <Pressable
                testID={`challenge-tap-${c.exerciseId}`}
                accessibilityRole="button"
                accessibilityLabel="Eine Wiederholung zählen"
                onPress={() => add(1)}
                style={({ pressed }) => ({
                  alignSelf: 'center',
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  backgroundColor: pressed ? colors.primary : colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 4,
                  borderColor: colors.primary,
                })}
              >
                <Txt style={{ fontSize: 52, lineHeight: 62, fontWeight: '800' }}>{done}</Txt>
                <Txt variant="caption">Tippen = +1</Txt>
              </Pressable>
              {c.exerciseId.includes('pushups') ? (
                <Txt variant="caption" center>
                  Tipp: Handy unter das Gesicht legen und bei jedem Liegestütz mit der Nase antippen 😉
                </Txt>
              ) : null}
              <Row gap={8}>
                <IconButton icon="minus" label="Eins weniger" bg={colors.cardAlt} onPress={() => add(-1)} disabled={done <= 0} />
                <Button small title="+5" variant="soft" full={false} style={{ flex: 1 }} onPress={() => add(5)} />
                <Button small title="+10" variant="soft" full={false} style={{ flex: 1 }} onPress={() => add(10)} />
                <Button
                  small
                  title="Fertig"
                  full={false}
                  style={{ flex: 1 }}
                  disabled={complete}
                  testID={`challenge-complete-${c.exerciseId}`}
                  onPress={() => actions.setChallengeProgress(today, c.id, Math.max(done, c.target))}
                />
              </Row>
            </>
          ) : (
            <>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Txt style={{ fontSize: 52, lineHeight: 62, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{done + (running ? secs : 0)} s</Txt>
                <Txt variant="caption">Ziel: {c.target} Sekunden</Txt>
              </View>
              <Row gap={8}>
                {running ? (
                  <Button title="Stopp" icon="stop" variant="danger" onPress={stopTimer} full={false} style={{ flex: 1 }} testID={`challenge-stop-${c.exerciseId}`} />
                ) : (
                  <Button
                    title="Timer starten"
                    icon="play"
                    full={false}
                    style={{ flex: 1 }}
                    testID={`challenge-start-${c.exerciseId}`}
                    onPress={() => {
                      startRef.current = Date.now();
                      baseRef.current = done;
                      setSecs(0);
                      setRunning(true);
                      haptics.medium();
                    }}
                  />
                )}
                <Button
                  title="Fertig"
                  variant="soft"
                  full={false}
                  style={{ flex: 1 }}
                  disabled={complete || running}
                  onPress={() => actions.setChallengeProgress(today, c.id, Math.max(done, c.target))}
                />
              </Row>
            </>
          )}
          {done > 0 ? (
            <Button small title="Heute zurücksetzen" variant="ghost" onPress={() => actions.setChallengeProgress(today, c.id, 0)} />
          ) : null}
          {lifetime != null ? (
            <Txt variant="caption" center>
              Insgesamt: {formatNumber(lifetime)} {c.name}
            </Txt>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

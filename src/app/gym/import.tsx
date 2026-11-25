import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';

import { useToast } from '../../components/Toast';
import { Button, Card, Divider, Input, Row, Screen, Txt } from '../../components/ui';
import { getGymExercise } from '../../lib/gym';
import { decodePlan, extractCode, type DecodedPlan } from '../../lib/planShare';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function ImportPlan() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const toast = useToast();
  const [text, setText] = useState(params.code ? decodeURIComponent(params.code) : '');

  // offer the clipboard content automatically if it contains a plan code
  useEffect(() => {
    if (params.code) return;
    let cancelled = false;
    Clipboard.getStringAsync()
      .then((c) => {
        if (!cancelled && c && extractCode(c)) setText(c);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [params.code]);

  const result = useMemo((): { ok: DecodedPlan } | { error: string } | null => {
    if (!text.trim()) return null;
    try {
      return { ok: decodePlan(text) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Ungültiger Code' };
    }
  }, [text]);

  const name = (id: string, decoded: DecodedPlan) => decoded.customExercises.find((e) => e.id === id)?.name ?? getGymExercise(state, id)?.name ?? id;

  return (
    <Screen edges={['bottom']}>
      <Txt variant="small">Füge die Nachricht mit dem Plan-Code ein, den du bekommen hast. Ist er schon in der Zwischenablage, wird er automatisch erkannt.</Txt>
      <Input
        testID="import-text"
        label="Plan-Code oder Nachricht"
        value={text}
        onChangeText={setText}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        placeholder="FITLIFE1:…"
      />
      <Button
        small
        variant="secondary"
        title="Aus Zwischenablage einfügen"
        icon="content-paste"
        onPress={async () => {
          try {
            setText(await Clipboard.getStringAsync());
          } catch {
            toast('Zwischenablage nicht verfügbar');
          }
        }}
      />
      {result && 'error' in result ? (
        <Txt variant="small" color={colors.danger}>
          {result.error}
        </Txt>
      ) : null}
      {result && 'ok' in result ? (
        <>
          <Card style={{ gap: 6 }} testID="import-preview">
            <Txt variant="h2">{result.ok.plan.name}</Txt>
            {result.ok.from ? <Txt variant="small">Von {result.ok.from}</Txt> : null}
            {result.ok.plan.description ? <Txt variant="small">{result.ok.plan.description}</Txt> : null}
          </Card>
          {result.ok.plan.days.map((d) => (
            <Card key={d.id} style={{ gap: 6 }}>
              <Txt variant="h3" color={colors.primary}>
                {d.name}
              </Txt>
              {d.exercises.map((e, i) => (
                <React.Fragment key={e.key}>
                  {i > 0 ? <Divider /> : null}
                  <Row justify="space-between">
                    <Txt variant="small" style={{ flex: 1 }}>
                      {name(e.exerciseId, result.ok)}
                    </Txt>
                    <Txt variant="small" bold>
                      {e.sets} × {e.repsMin}–{e.repsMax}
                    </Txt>
                  </Row>
                </React.Fragment>
              ))}
            </Card>
          ))}
          <Button
            title="Plan übernehmen"
            icon="download"
            testID="import-save"
            onPress={() => {
              for (const ex of result.ok.customExercises) actions.saveGymExercise(ex);
              actions.savePlan(result.ok.plan, true);
              toast({ message: 'Plan importiert und aktiviert', icon: 'check' });
              router.replace({ pathname: '/gym/plan-edit', params: { id: result.ok.plan.id } });
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

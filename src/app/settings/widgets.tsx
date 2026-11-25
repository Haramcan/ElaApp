import React from 'react';
import { Platform, View } from 'react-native';

import { Card, Chip, Icon, ProgressBar, Row, Screen, SwitchRow, Txt } from '../../components/ui';
import { useToday } from '../../lib/hooks';
import { useStore } from '../../lib/store';
import { radius, useTheme } from '../../lib/theme';
import type { WidgetMetric } from '../../lib/types';
import { buildLiveProps, buildMetricViews, METRIC_LABELS } from '../../lib/widgetData';

const METRICS: WidgetMetric[] = ['overview', 'steps', 'kcal', 'water', 'protein', 'challenge'];

export default function WidgetSettings() {
  const { state, actions } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const s = state.settings;
  const views = buildMetricViews(state, today);
  const preview = s.widgetMetric === 'overview' ? null : views[s.widgetMetric];
  const live = buildLiveProps(state, today);
  const ios = Platform.OS === 'ios';

  return (
    <Screen edges={['bottom']}>
      <Txt variant="label">Homescreen-Widget</Txt>
      <Card style={{ gap: 12 }}>
        <Txt variant="small">Was soll das Widget anzeigen?</Txt>
        <Row gap={6} wrap>
          {METRICS.map((m) => (
            <Chip key={m} label={METRIC_LABELS[m]} selected={s.widgetMetric === m} onPress={() => actions.updateSettings({ widgetMetric: m })} testID={`widget-metric-${m}`} />
          ))}
        </Row>

        <Txt variant="caption">Vorschau</Txt>
        <View style={{ alignSelf: 'center', width: 170, height: 170, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 }} testID="widget-preview">
          {preview ? (
            <>
              <Txt variant="caption">{preview.emoji} FitLife</Txt>
              <View style={{ flex: 1 }} />
              <Txt variant="title">{preview.value}</Txt>
              <Txt variant="small" bold>
                {preview.label}
              </Txt>
              <Txt variant="caption" numberOfLines={1}>
                {preview.sub}
              </Txt>
              <ProgressBar value={preview.progress} max={1} height={6} />
            </>
          ) : (
            <>
              <Txt variant="caption" bold color={colors.primary}>
                FitLife
              </Txt>
              {(['kcal', 'steps', 'water'] as const).map((k) => (
                <View key={k} style={{ gap: 2, marginTop: 4 }}>
                  <Txt variant="caption" bold numberOfLines={1}>
                    {views[k].emoji} {views[k].value} {views[k].label}
                  </Txt>
                  <ProgressBar value={views[k].progress} max={1} height={4} />
                </View>
              ))}
            </>
          )}
        </View>

        <Card style={{ backgroundColor: colors.cardAlt, gap: 6 }}>
          <Txt variant="small" bold>
            So fügst du das Widget hinzu
          </Txt>
          {ios ? (
            <>
              <Txt variant="small">1. Homescreen lange gedrückt halten → oben links auf „Bearbeiten“ → „Widget hinzufügen“.</Txt>
              <Txt variant="small">2. „FitLife“ suchen, Größe wählen (klein, mittel oder Sperrbildschirm).</Txt>
              <Txt variant="small">3. Pro Widget kannst du die Anzeige ändern: Widget lange drücken → „Widget bearbeiten“ → z. B. nur Schritte.</Txt>
            </>
          ) : (
            <>
              <Txt variant="small">1. Homescreen lange gedrückt halten → „Widgets“.</Txt>
              <Txt variant="small">2. „FitLife“ suchen und auf den Homescreen ziehen.</Txt>
              <Txt variant="small">3. Die Anzeige wählst du hier oben aus.</Txt>
            </>
          )}
          <Txt variant="caption">Das Widget aktualisiert sich, wenn du Daten einträgst oder die App öffnest.</Txt>
        </Card>
      </Card>

      <Txt variant="label">{ios ? 'Dynamic Island & Sperrbildschirm' : 'Live-Benachrichtigung'}</Txt>
      <Card style={{ gap: 10 }}>
        <SwitchRow
          title={ios ? 'Live-Anzeige in der Dynamic Island' : 'Dauerhafte Live-Benachrichtigung'}
          subtitle={
            ios
              ? 'Zeigt laufendes Training (mit Timer), Fasten-Countdown oder deinen Tageswert oben im Display und auf dem Sperrbildschirm.'
              : 'Zeigt laufendes Training, Fasten oder deinen Tageswert dauerhaft in der Benachrichtigungsleiste.'
          }
          value={s.liveStatus}
          onChange={(v) => actions.updateSettings({ liveStatus: v })}
          icon={ios ? 'cellphone-text' : 'bell-badge-outline'}
          testID="live-toggle"
        />
        {s.liveStatus ? (
          <>
            <Txt variant="small">Wenn gerade kein Training und kein Fasten läuft, zeige:</Txt>
            <Row gap={6} wrap>
              {METRICS.filter((m) => m !== 'overview').map((m) => (
                <Chip key={m} label={METRIC_LABELS[m]} selected={s.liveMetric === m} onPress={() => actions.updateSettings({ liveMetric: m })} testID={`live-metric-${m}`} />
              ))}
            </Row>
            {live ? (
              <View style={{ backgroundColor: '#000', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center' }} testID="live-preview">
                <Icon name="circle-slice-5" size={16} color="#22c55e" />
                <Txt variant="small" bold color="#fff">
                  {live.emoji} {live.value}
                </Txt>
              </View>
            ) : null}
            <Txt variant="caption">
              {ios
                ? 'Hinweis: iOS beendet Live-Aktivitäten nach spätestens 8 Stunden. Öffne die App, dann startet die Anzeige neu. Live-Aktivitäten müssen in den iPhone-Einstellungen für FitLife erlaubt sein.'
                : 'Hinweis: Benachrichtigungen müssen für FitLife erlaubt sein.'}
            </Txt>
          </>
        ) : null}
      </Card>
      {Platform.OS === 'web' ? (
        <Txt variant="caption" center>
          Widgets und Live-Anzeige gibt es nur in der iPhone- und Android-App.
        </Txt>
      ) : null}
      <View style={{ height: 8, borderRadius: radius.sm }} />
    </Screen>
  );
}

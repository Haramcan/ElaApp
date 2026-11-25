import type { FitWidgetProps, LiveStatusProps, MetricView } from '../widgets/types';
import { energyValue, formatNumber } from './calc';
import { sessionSetCount } from './gym';
import { challengeProgress, daySummary } from './selectors';
import type { AppState, WidgetMetric } from './types';

export const METRIC_LABELS: Record<WidgetMetric, string> = {
  overview: 'Übersicht',
  steps: 'Schritte',
  kcal: 'Kalorien',
  water: 'Wasser',
  protein: 'Eiweiß',
  challenge: 'Challenges',
};

const clamp01 = (v: number) => (isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

export function buildMetricViews(state: AppState, date: string): FitWidgetProps['items'] {
  const s = daySummary(state, date);
  const eu = state.settings.energyUnit;
  const cp = challengeProgress(state, date);
  const open = cp.items.find((i) => !i.complete);
  const over = s.remaining < 0;
  const views: Record<Exclude<WidgetMetric, 'overview'>, MetricView> = {
    kcal: {
      value: formatNumber(energyValue(Math.abs(s.remaining), eu)),
      label: over ? `${eu} zu viel` : `${eu} übrig`,
      sub: `${formatNumber(energyValue(s.eaten, eu))} von ${formatNumber(energyValue(s.goal, eu))} ${eu}`,
      progress: clamp01(s.eaten / Math.max(1, s.goal)),
      symbol: 'flame.fill',
      emoji: '🔥',
    },
    steps: {
      value: formatNumber(s.steps),
      label: 'Schritte',
      sub: `Ziel ${formatNumber(s.stepsGoal)}`,
      progress: clamp01(s.steps / Math.max(1, s.stepsGoal)),
      symbol: 'figure.walk',
      emoji: '👟',
    },
    water: {
      value: `${formatNumber(s.water / 1000, 2)} l`,
      label: 'Wasser',
      sub: `Ziel ${formatNumber(s.waterGoal / 1000, 2)} l`,
      progress: clamp01(s.water / Math.max(1, s.waterGoal)),
      symbol: 'drop.fill',
      emoji: '💧',
    },
    protein: {
      value: `${formatNumber(s.protein)} g`,
      label: 'Eiweiß',
      sub: `Ziel ${formatNumber(s.macroGoals.protein)} g`,
      progress: clamp01(s.protein / Math.max(1, s.macroGoals.protein)),
      symbol: 'bolt.heart.fill',
      emoji: '💪',
    },
    challenge: {
      value: `${cp.completed}/${cp.total}`,
      label: 'Challenges',
      sub: open ? `Offen: ${open.challenge.target - open.done}${open.challenge.unit === 'sec' ? ' s' : '×'} ${open.challenge.name}` : cp.total ? 'Alles geschafft! 🎉' : 'Keine aktiv',
      progress: clamp01(cp.total ? cp.completed / cp.total : 0),
      symbol: 'checkmark.circle.fill',
      emoji: '✅',
    },
  };
  return views;
}

export function buildWidgetProps(state: AppState, date: string, now: Date = new Date()): FitWidgetProps {
  return {
    metric: state.settings.widgetMetric,
    items: buildMetricViews(state, date),
    updated: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  };
}

/**
 * What the Live Activity (iPhone) / ongoing notification (Android) shows.
 * Priority: running gym session > active fast > chosen daily metric.
 */
export function buildLiveProps(state: AppState, date: string, now: number = Date.now()): LiveStatusProps | null {
  const gym = state.gym.active;
  if (gym) {
    const sets = sessionSetCount(gym);
    return {
      title: 'Training läuft',
      value: `${sets} ${sets === 1 ? 'Satz' : 'Sätze'}`,
      sub: gym.name,
      progress: clamp01((now - gym.start) / (75 * 60000)),
      symbol: 'dumbbell.fill',
      emoji: '🏋️',
      timerStart: gym.start,
      timerEnd: gym.start + 6 * 3600000,
      countdown: false,
    };
  }
  const fast = state.fasting.active;
  if (fast) {
    const end = fast.start + fast.targetHours * 3600000;
    const reached = now >= end;
    return {
      title: reached ? 'Fastenziel erreicht' : 'Fasten',
      value: reached ? '🎉' : `${fast.targetHours} h`,
      sub: reached ? 'Beende dein Fasten in der App' : `Ziel um ${new Date(end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
      progress: clamp01((now - fast.start) / (end - fast.start)),
      symbol: 'timer',
      emoji: '⏳',
      ...(reached ? {} : { timerStart: fast.start, timerEnd: end, countdown: true }),
    };
  }
  const metric = state.settings.liveMetric === 'overview' ? 'kcal' : state.settings.liveMetric;
  const v = buildMetricViews(state, date)[metric];
  return { title: METRIC_LABELS[metric], value: v.value, sub: v.sub, progress: v.progress, symbol: v.symbol, emoji: v.emoji };
}

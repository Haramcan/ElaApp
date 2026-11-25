import type { WidgetMetric } from '../lib/types';

/** One pre-formatted value shown in a widget (formatting happens in the app – widgets run in an isolated runtime) */
export interface MetricView {
  value: string;
  label: string;
  sub: string;
  /** 0–1 */
  progress: number;
  /** SF Symbol name (iOS) */
  symbol: string;
  /** emoji used on Android, where SF Symbols don't exist */
  emoji: string;
}

export interface FitWidgetProps {
  /** default metric chosen in the app */
  metric: WidgetMetric;
  items: Record<Exclude<WidgetMetric, 'overview'>, MetricView>;
  updated: string;
}

export interface LiveStatusProps {
  title: string;
  value: string;
  sub: string;
  progress: number;
  symbol: string;
  emoji: string;
  /** optional live timer (ms timestamps) */
  timerStart?: number;
  timerEnd?: number;
  countdown?: boolean;
}

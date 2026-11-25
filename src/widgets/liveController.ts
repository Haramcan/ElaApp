// Web / fallback: no live status outside of iOS and Android.
import type { LiveStatusProps } from './types';

export const liveSupported = false;

export async function showLiveStatus(_props: LiveStatusProps): Promise<void> {}

export async function hideLiveStatus(): Promise<void> {}

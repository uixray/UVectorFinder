import { PluginSettings } from './types';

export const STORAGE_KEY = 'uvf:settings';

export const UI_WIDTH = 360;
export const UI_HEIGHT = 560;

export const BATCH_SIZE = 50;

export const TOLERANCE_PRESETS = [
  { label: 'Exact', value: 0 },
  { label: 'Pixel', value: 0.5 },
  { label: 'Relaxed', value: 2.0 },
  { label: 'Loose', value: 5.0 },
] as const;

export const HIGHLIGHT_COLORS: Array<{ r: number; g: number; b: number }> = [
  { r: 1, g: 0.2, b: 0.2 },
  { r: 0.2, g: 0.6, b: 1 },
  { r: 0.2, g: 0.8, b: 0.2 },
  { r: 1, g: 0.6, b: 0 },
  { r: 0.6, g: 0.2, b: 1 },
  { r: 1, g: 0.8, b: 0 },
];

export const DEFAULT_SETTINGS: PluginSettings = {
  version: 1,
  scope: 'page',
  method: 'vectorPaths',
  tolerance: 0.5,
  filters: {
    includeHidden: false,
    includeLocked: true,
  },
};

export const COMMAND_ARG_COUNTS: Record<string, number> = {
  M: 2,
  L: 2,
  Q: 4,
  C: 6,
  Z: 0,
};

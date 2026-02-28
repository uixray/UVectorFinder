import { PluginSettings } from '../types';
import { STORAGE_KEY, DEFAULT_SETTINGS } from '../constants';

export async function loadSettings(): Promise<PluginSettings> {
  try {
    const saved = await figma.clientStorage.getAsync(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      return { ...DEFAULT_SETTINGS, ...saved };
    }
  } catch (e) {
    // Ignore storage errors, use defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: PluginSettings): Promise<void> {
  try {
    await figma.clientStorage.setAsync(STORAGE_KEY, settings);
  } catch (e) {
    // Ignore storage errors
  }
}

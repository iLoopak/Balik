import { create } from 'zustand';
export type ColorMode = 'dark' | 'light';
export type ColorModePreference = ColorMode | 'system';
export const COLOR_MODE_KEY = 'balik.colorMode';
export const COLOR_MODE_MEDIA = '(prefers-color-scheme: dark)';
export function parseColorMode(value: unknown): ColorModePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
export function resolveColorMode(preference: ColorModePreference, systemDark: boolean): ColorMode {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}
function systemDark() {
  return typeof window === 'undefined' || !window.matchMedia
    ? true
    : window.matchMedia(COLOR_MODE_MEDIA).matches;
}
function load(): ColorModePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    return parseColorMode(localStorage.getItem(COLOR_MODE_KEY));
  } catch {
    return 'system';
  }
}
const preference = load();
export const useColorMode = create<{ preference: ColorModePreference; mode: ColorMode }>(() => ({
  preference,
  mode: resolveColorMode(preference, systemDark()),
}));
function apply() {
  if (typeof document === 'undefined') return;
  const { mode } = useColorMode.getState();
  document.documentElement.dataset.colorMode = mode;
  document.documentElement.style.colorScheme = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', mode === 'light' ? '#f5f0e6' : '#10141f');
}
export function setColorMode(value: ColorModePreference) {
  const preference = parseColorMode(value);
  useColorMode.setState({ preference, mode: resolveColorMode(preference, systemDark()) });
  try {
    localStorage.setItem(COLOR_MODE_KEY, preference);
  } catch {
    /* session still works */
  }
  apply();
}
/** One application-level listener; changing mode does not remount a screen or a card. */
export function startColorModeSync() {
  const media = window.matchMedia?.(COLOR_MODE_MEDIA);
  const update = () => {
    useColorMode.setState({
      mode: resolveColorMode(useColorMode.getState().preference, media?.matches ?? true),
    });
    apply();
  };
  const storage = (event: StorageEvent) => {
    if (event.key !== COLOR_MODE_KEY && event.key !== null) return;
    useColorMode.setState({ preference: parseColorMode(event.newValue) });
    update();
  };
  update();
  media?.addEventListener('change', update);
  window.addEventListener('storage', storage);
  return () => {
    media?.removeEventListener('change', update);
    window.removeEventListener('storage', storage);
  };
}

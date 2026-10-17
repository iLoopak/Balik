import { create } from 'zustand';
export interface BrandPreferences { muted: boolean; volume: number; mascot: boolean }
const defaults: BrandPreferences = { muted: false, volume: .35, mascot: true };
function load(): BrandPreferences {
  if (typeof window === 'undefined') return defaults;
  try {
    const value = JSON.parse(localStorage.getItem('balik.brand') ?? '{}');
    return { muted: typeof value.muted === 'boolean' ? value.muted : defaults.muted,
      mascot: typeof value.mascot === 'boolean' ? value.mascot : defaults.mascot,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume) ? Math.max(0, Math.min(1, value.volume)) : defaults.volume };
  } catch { return defaults; }
}
export const useBrandPreferences = create<BrandPreferences>(() => load());
export function setBrandPreferences(patch: Partial<BrandPreferences>) {
  const next = { ...useBrandPreferences.getState(), ...patch };
  next.volume = Math.max(0, Math.min(1, next.volume));
  useBrandPreferences.setState(next);
  try { localStorage.setItem('balik.brand', JSON.stringify(next)); } catch { /* Session preference still works. */ }
}

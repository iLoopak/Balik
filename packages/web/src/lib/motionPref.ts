import { useReducedMotion } from 'motion/react';
import { create } from 'zustand';

type Pref = 'system' | 'reduced';
const KEY = 'balik.motion';

function load(): Pref {
  try {
    return localStorage.getItem(KEY) === 'reduced' ? 'reduced' : 'system';
  } catch {
    return 'system';
  }
}

const usePrefStore = create<{ pref: Pref }>(() => ({ pref: load() }));

/** Reduced motion = OS setting or the in-game toggle. */
export function useMotionPref() {
  const pref = usePrefStore((s) => s.pref);
  const system = useReducedMotion() ?? false;
  const setPref = (p: Pref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      // Storage unavailable: the toggle still works for this session.
    }
    usePrefStore.setState({ pref: p });
  };
  return { pref, setPref, reduced: pref === 'reduced' || system };
}

import { create } from 'zustand';
import { GAME_IDS, type GameId } from '@balik/shared';

/** Local, per-game guide memory: no account and nothing sent to the server. */
export interface GuidePrefs { off: GameId[]; seen: string[] }
export const GUIDE_KEY = 'balik.guide';
/** Older per-game intros already count as the guide's first-play goal. */
const LEGACY_INTROS: Partial<Record<GameId, string>> = { lhar: 'balik.lhar.intro', sedma: 'balik.sedma.intro' };
const MAX_SEEN = 200;

export function parseGuide(raw: string | null): GuidePrefs {
  try {
    const v = JSON.parse(raw ?? '{}') as Partial<Record<keyof GuidePrefs, unknown>>;
    const off = Array.isArray(v.off) ? v.off.filter((id): id is GameId => (GAME_IDS as readonly unknown[]).includes(id)) : [];
    const seen = Array.isArray(v.seen) ? v.seen.filter((id): id is string => typeof id === 'string').slice(-MAX_SEEN) : [];
    return { off: [...new Set(off)], seen: [...new Set(seen)] };
  } catch {
    return { off: [], seen: [] };
  }
}

function load(): GuidePrefs {
  if (typeof localStorage === 'undefined') return { off: [], seen: [] };
  try {
    const prefs = parseGuide(localStorage.getItem(GUIDE_KEY));
    for (const [game, key] of Object.entries(LEGACY_INTROS)) if (localStorage.getItem(key!) && !prefs.seen.includes(`${game}.intro`)) prefs.seen.push(`${game}.intro`);
    return prefs;
  } catch {
    return { off: [], seen: [] };
  }
}

export const useGuidePrefs = create<GuidePrefs>(() => load());
function save(next: GuidePrefs) {
  useGuidePrefs.setState(next);
  try { localStorage.setItem(GUIDE_KEY, JSON.stringify(next)); } catch { /* the session still remembers */ }
}
export function markSeen(...ids: string[]) {
  const { off, seen } = useGuidePrefs.getState();
  const fresh = ids.filter((id) => !seen.includes(id));
  if (fresh.length) save({ off, seen: [...seen, ...fresh].slice(-MAX_SEEN) });
}
/** „Už nezobrazovat pro tuto hru.“ */
export function setGuideOff(game: GameId, hidden: boolean) {
  const { off, seen } = useGuidePrefs.getState();
  // Turning a game's guide back on starts its explanations over.
  save(hidden ? { off: [...new Set([...off, game])], seen } : { off: off.filter((g) => g !== game), seen: seen.filter((id) => !id.startsWith(`${game}.`)) });
}

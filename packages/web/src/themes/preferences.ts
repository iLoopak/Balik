import { create } from 'zustand';
import { DECK_THEMES, isDeckId, isTableId, isTableTone, type DeckId, type TableId, type TableTone } from './registry';
export interface AppearancePreferences { deck: DeckId; table: TableId; tone: TableTone }
export const APPEARANCE_KEY = 'balik.appearance';
export const DEFAULT_APPEARANCE: AppearancePreferences = { deck: 'stormpunk', table: 'stormpunk', tone: 'dark' };
export function parseAppearance(raw: string | null): AppearancePreferences {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object') return { ...DEFAULT_APPEARANCE };
    const v = value as Record<string, unknown>;
    return { deck: isDeckId(v.deck) ? v.deck : DEFAULT_APPEARANCE.deck, table: isTableId(v.table) ? v.table : DEFAULT_APPEARANCE.table, tone: isTableTone(v.tone) ? v.tone : DEFAULT_APPEARANCE.tone };
  } catch { return { ...DEFAULT_APPEARANCE }; }
}
function load() {
  let value = { ...DEFAULT_APPEARANCE };
  if (typeof window !== 'undefined') {
    try { value = parseAppearance(localStorage.getItem(APPEARANCE_KEY)); } catch { /* private browsing */ }
    const query = new URLSearchParams(window.location.search);
    if (isDeckId(query.get('deck'))) value.deck = query.get('deck') as DeckId;
    if (isTableId(query.get('table'))) value.table = query.get('table') as TableId;
    if (isTableTone(query.get('tone'))) value.tone = query.get('tone') as TableTone;
  }
  return value;
}
export const useAppearance = create<AppearancePreferences>(() => load());
export function setAppearance(patch: Partial<AppearancePreferences>) {
  const old = useAppearance.getState();
  const next = { deck: isDeckId(patch.deck) ? patch.deck : old.deck, table: isTableId(patch.table) ? patch.table : old.table, tone: isTableTone(patch.tone) ? patch.tone : old.tone };
  useAppearance.setState(next);
  try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); } catch { /* session still works */ }
  // A URL preview is an initial override only; a manual choice must survive reload.
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (['deck', 'table', 'tone'].some(k => url.searchParams.has(k))) {
      url.searchParams.delete('deck'); url.searchParams.delete('table'); url.searchParams.delete('tone');
      window.history.replaceState(window.history.state, '', url);
    }
  }
}
export function deckAssetUrls(deck: DeckId): string[] {
  const theme = DECK_THEMES[deck];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
  return [...new Set([...(theme.back ? [theme.back] : []), ...suits.flatMap(suit => ranks.flatMap(rank => {
    const asset = theme.stickerFor({ id: `${suit}-${rank}`, suit, rank }); return asset ? [asset.src] : [];
  }))])];
}
/** Whole edition only: loading cannot encode anybody's private hand. */
export function preloadDeck(deck: DeckId): () => void {
  if (typeof Image === 'undefined') return () => {};
  const images = deckAssetUrls(deck).map(src => { const img = new Image(); img.decoding = 'async'; img.src = src; return img; });
  return () => { for (const img of images) { img.onload = null; img.onerror = null; } };
}

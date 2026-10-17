import type { Suit } from '@balik/shared';
import type { CSSProperties } from 'react';
import { DECK_THEMES, type DeckId } from '../themes/registry';
import { useAppearance } from '../themes/preferences';
/** Registry geometry keeps each suit identifiable without color. */
export function SuitIcon({ suit, className, style, title, deck: override }: {
  suit: Suit; className?: string; style?: CSSProperties; title?: string; deck?: DeckId;
}) {
  const selected = useAppearance(p => p.deck);
  const glyph = DECK_THEMES[override ?? selected].suits[suit];
  return <svg viewBox={glyph.viewBox} className={className} style={style} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
    {title && <title>{title}</title>}
    {glyph.paths.map((d, i) => <path key={i} d={d} fill={glyph.filled ? 'currentColor' : 'none'} stroke={glyph.viewBox === '0 0 24 24' ? 'currentColor' : undefined} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}

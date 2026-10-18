import type { Suit } from '@balik/shared';
import type { CSSProperties } from 'react';
import { effectTheme } from './effectTokens';
import './effects.css';
import { useColorMode } from '../themes/colorMode';
import type { DeckId } from '../themes/registry';

/** Current-card treatment is a persistent state, separate from all transient bursts. */
export function CardEffectLayer({ current, suit, deck }: { current?: boolean; suit: Suit; deck?: DeckId }) {
  const mode = useColorMode(p => p.mode);
  if (!current) return null;
  return <div data-layer="card-effect" className="card-current-effect" style={{ '--fx-color': effectTheme(suit, deck, mode).color } as CSSProperties} aria-hidden="true" />;
}

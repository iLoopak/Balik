import type { Suit } from '@balik/shared';
import type { CSSProperties } from 'react';
import { effectTheme } from './effectTokens';
import './effects.css';

/** Current-card treatment is a persistent state, separate from all transient bursts. */
export function CardEffectLayer({ current, suit }: { current?: boolean; suit: Suit }) {
  if (!current) return null;
  return <div data-layer="card-effect" className="card-current-effect" style={{ '--fx-color': effectTheme(suit).color } as CSSProperties} aria-hidden="true" />;
}

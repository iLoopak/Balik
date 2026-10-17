import type { Suit } from '@balik/shared';
import type { CSSProperties } from 'react';
import { ACTIVE_DECK, SUIT_FACTION, type DeckId } from './skin';
import { FactionIcon } from '../decks/stormpunk/FactionIcon';

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

// SVG glyphs instead of ♥♦♣♠ text: consistent across platforms, never rendered as emoji.
// Each shape is its own path so overlapping parts never cancel out.
const PATHS: Record<Suit, string[]> = {
  hearts: ['M50 90C22 68 4 50 4 30 4 15 15 5 28 5c10 0 18 6 22 15 4-9 12-15 22-15 13 0 24 10 24 25 0 20-18 38-46 60Z'],
  diamonds: ['M50 3Q67 29 89 50 67 71 50 97 33 71 11 50 33 29 50 3Z'],
  spades: [
    'M50 4c12 20 44 34 44 57 0 14-10 24-22 24-9 0-16-5-19-11 1 10 5 17 13 22H34c8-5 12-12 13-22-3 6-10 11-19 11C16 85 6 75 6 61 6 38 38 24 50 4Z',
  ],
  clubs: [circle(50, 29, 19), circle(29, 59, 19), circle(71, 59, 19), circle(50, 52, 12), 'M46 58Q46 84 32 95H68Q54 84 54 58Z'],
};

export function SuitIcon({
  suit,
  className,
  style,
  title,
  deck = ACTIVE_DECK,
}: {
  suit: Suit;
  className?: string;
  style?: CSSProperties;
  title?: string;
  deck?: DeckId;
}) {
  if (deck === 'stormpunk') return <FactionIcon faction={SUIT_FACTION[suit]} className={className} style={style} title={title} />;
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[suit].map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

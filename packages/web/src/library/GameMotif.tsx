import type { ReactNode } from 'react';
import type { GameId, Suit } from '@balik/shared';
import { CLASSIC_PATHS } from '../themes/decks/classic';
import './motif.css';

/**
 * A game's mark in the library: its mechanic drawn with neutral BALÍK cards.
 * It deliberately ignores the chosen deck edition, so Prší reads as Prší whatever
 * cards the player has picked. Colours come from CSS tokens (light and dark).
 */
export function GameMotif({ id, className = '' }: { id: GameId; className?: string }) {
  return (
    <svg className={`motif motif-${id} ${className}`} viewBox="0 0 160 104" aria-hidden focusable="false">
      {MOTIFS[id]}
    </svg>
  );
}

const RED = new Set<Suit>(['hearts', 'diamonds']);
interface At { x: number; y: number; r?: number; s?: number; className?: string }
const at = ({ x, y, r = 0, s = 1 }: At) => `translate(${x} ${y}) rotate(${r}) scale(${s})`;

function Pip({ suit, x, y, size }: { suit: Suit; x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})`} className={RED.has(suit) ? 'm-red' : 'm-ink'}>
      {CLASSIC_PATHS[suit].map((d) => <path key={d} d={d} />)}
    </g>
  );
}

/**
 * Placement lives on the outer group (SVG attribute); the inner group carries the classes,
 * because a CSS transform (hover lift) would replace the attribute on the same element.
 */
function Placed({ pos, className, children }: { pos: At; className: string; children: ReactNode }) {
  return <g transform={at(pos)}><g className={`m-card ${className}${pos.className ? ` ${pos.className}` : ''}`}>{children}</g></g>;
}

/** A face-up card: index top-left, big suit in the middle. */
function Face({ rank, suit, hi, dark, ...pos }: At & { rank: string; suit: Suit; hi?: boolean; dark?: boolean }) {
  return (
    <Placed pos={pos} className={`${hi ? 'is-hi' : ''}${dark ? ' is-dark' : ''}`}>
      <rect x={-15} y={-21} width={30} height={42} rx={4} className="m-face" />
      <text x={-11.5} y={-10} className={`m-rank ${RED.has(suit) ? 'm-red' : 'm-ink'}`}>{rank}</text>
      <Pip suit={suit} x={2} y={5} size={15} />
    </Placed>
  );
}

/** A BALÍK card back: one shared back for every motif. */
function Back(pos: At) {
  return (
    <Placed pos={pos} className="">
      <rect x={-15} y={-21} width={30} height={42} rx={4} className="m-back" />
      <rect x={-11} y={-17} width={22} height={34} rx={2} className="m-back-line" />
      <path d="M0 -7 7 0 0 7 -7 0Z" className="m-back-mark" />
    </Placed>
  );
}

function Chip({ x, y, children, w = 26 }: { x: number; y: number; children: ReactNode; w?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="m-chip">
      <rect x={-w / 2} y={-8} width={w} height={16} rx={8} />
      <text y={4}>{children}</text>
    </g>
  );
}

const MOTIFS: Record<GameId, ReactNode> = {
  // Discard pile, a card landing on it and the four suits a svršek can call.
  prsi: (
    <>
      <g className="m-rain">{[18, 34, 132, 146].map((x, i) => <path key={x} d={`M${x} ${10 + (i % 2) * 10}l-3 8`} />)}</g>
      <Face x={66} y={60} r={-9} rank="9" suit="clubs" />
      <Face x={72} y={58} r={4} rank="9" suit="hearts" />
      <path d="M134 30Q112 18 92 40" className="m-trail" />
      <Face x={98} y={52} r={16} rank="Q" suit="hearts" hi className="m-lift" />
      <g className="m-suits">
        <Pip suit="hearts" x={28} y={46} size={10} />
        <Pip suit="diamonds" x={40} y={34} size={10} />
        <Pip suit="spades" x={28} y={72} size={10} />
        <Pip suit="clubs" x={40} y={84} size={10} />
      </g>
    </>
  ),
  // A trick of equal ranks, taken over by the seven.
  sedma: (
    <>
      <Face x={42} y={58} r={-14} rank="K" suit="spades" />
      <Face x={64} y={54} r={-4} rank="K" suit="diamonds" />
      <Face x={86} y={56} r={6} rank="9" suit="clubs" />
      <Face x={110} y={48} r={14} rank="7" suit="hearts" hi className="m-lift" />
      <Chip x={124} y={88} w={34}>bere</Chip>
    </>
  ),
  // Cards laid face down with a claim; one turns over to check it.
  lhar: (
    <>
      <Back x={52} y={62} r={-12} />
      <Back x={64} y={58} r={-2} />
      <Back x={76} y={60} r={9} />
      <g className="m-flip"><Face x={108} y={56} r={12} rank="8" suit="spades" hi /></g>
      <g className="m-bubble" transform="translate(44 18)">
        <path d="M-24 -11h48a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H-6l-8 7v-7h-10a6 6 0 0 1-6-6V-5a6 6 0 0 1 6-6Z" />
        <text y={4}>3× K</text>
      </g>
      <text x={128} y={30} className="m-big">?</text>
    </>
  ),
  // King and queen of one suit: the marriage, worth twenty on the way to 66.
  snaps: (
    <>
      <text x={80} y={66} className="m-ghost">66</text>
      <Face x={62} y={56} r={-10} rank="K" suit="hearts" />
      <Face x={92} y={54} r={8} rank="Q" suit="hearts" hi className="m-lift" />
      <Chip x={126} y={26} w={32}>+20</Chip>
    </>
  ),
  // Attack cards, each covered across by a higher defending card.
  durak: (
    <>
      <Face x={50} y={56} rank="8" suit="diamonds" className="m-dim" />
      <Face x={56} y={58} r={24} rank="J" suit="diamonds" className="m-dim" />
      <Face x={98} y={52} rank="9" suit="clubs" />
      <Face x={106} y={56} r={-26} rank="A" suit="clubs" hi className="m-lift" />
      <path d="M22 86q10-6 20 0M120 22q10 6 20 0" className="m-trail" />
    </>
  ),
  // The declarer's fan over the talon, with the trump card turned sideways.
  marias: (
    <>
      <Back x={46} y={58} r={90} />
      <Back x={40} y={52} r={-8} />
      <Face x={82} y={60} r={-18} rank="K" suit="spades" />
      <Face x={100} y={54} r={-2} rank="Q" suit="spades" />
      <Face x={118} y={58} r={14} rank="A" suit="diamonds" hi className="m-lift" />
      <Chip x={44} y={20} w={40}>trumf</Chip>
    </>
  ),
  // A fan of hidden cards; the one drawn out is the black jack.
  petr: (
    <>
      {[-24, -12, 0, 12, 24].map((r, i) => <Back key={r} x={80 + (i - 2) * 9} y={70} r={r} />)}
      <Face x={98} y={30} r={10} rank="J" suit="spades" dark hi className="m-lift" />
      <path d="M86 46q-4 6 0 12" className="m-trail" />
    </>
  ),
  // Two cards counting towards 21.
  oko: (
    <>
      <Face x={58} y={58} r={-10} rank="A" suit="spades" />
      <Face x={82} y={54} r={8} rank="10" suit="hearts" hi className="m-lift" />
      <g className="m-eye" transform="translate(124 44)">
        <path d="M-20 0Q0 -18 20 0Q0 18 -20 0Z" />
        <circle r={7} />
        <text y={3.5}>21</text>
      </g>
    </>
  ),
  // A grid of backs with one pair turned up: same rank, same colour.
  pexeso: (
    <>
      {[0, 1, 2, 3].flatMap((c) => [0, 1].map((r) => {
        const x = 32 + c * 32, y = 30 + r * 46;
        if ((c === 1 && r === 0) || (c === 3 && r === 1)) return null;
        return <Back key={`${c}${r}`} x={x} y={y} s={0.82} />;
      }))}
      <Face x={64} y={30} s={0.82} rank="9" suit="hearts" hi />
      <Face x={128} y={76} s={0.82} rank="9" suit="diamonds" hi className="m-lift" />
      <path d="M76 38Q108 40 118 64" className="m-trail" />
    </>
  ),
};

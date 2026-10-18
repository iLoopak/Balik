import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GAME_INFO, type AnyRoomView } from '@balik/shared';
import { BrandMascot } from '../brand/BrandMascot';
import { RulesButton } from '../rules/RulesPanel';
import { useApp } from '../net/store';
import { guideFor, guideGoal, type GuideHint } from './guides';
import { markSeen, setGuideOff, useGuidePrefs } from './preferences';
import './guide.css';

/** The cards must stay still this long before the strip changes, so fast bot turns never flash text. */
const SETTLE_MS = 450;
const POLL_MS = 120;

/** True while any card on the table is animating (Motion runs card transforms on WAAPI). */
const cardsMoving = () => [...document.querySelectorAll('.game-screen .card-slot')]
  .some((el) => el.getAnimations().some((a) => a.playState === 'running'));

/**
 * BLIK's short note for the decision in front of the player. It sits in the layout above
 * the table (the table shrinks, nothing is covered) and never blocks a click. It changes
 * the layout only while no card is moving: resizing the table while a card flies would
 * retarget its WAAPI animation and snap the card. It only reads the DOM while a change is
 * pending, and never touches the director. Each situation is explained once.
 */
export function GameGuide({ room, reduced }: { room: AnyRoomView; reduced: boolean }) {
  const status = useApp((s) => s.status);
  const { off, seen } = useGuidePrefs();
  const game = room.gameId;
  const raw = status === 'open' && !off.includes(game) ? guideFor(room) : null;
  const hint = raw && !seen.includes(raw.id) ? raw : null;
  const [shown, setShown] = useState<GuideHint | null>(null);
  const latest = useRef(hint);
  latest.current = hint;
  const same = shown?.id === hint?.id && shown?.text === hint?.text;
  useEffect(() => {
    if (same) return;
    let still = 0;
    const timer = setInterval(() => {
      still = cardsMoving() ? 0 : still + POLL_MS;
      if (still >= SETTLE_MS) { clearInterval(timer); setShown(latest.current); }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [same, hint?.id, hint?.text]);
  // Once a shown hint's moment passes, it has been explained.
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current && previous.current !== shown?.id) markSeen(previous.current, `${game}.intro`);
    previous.current = shown?.id ?? null;
  }, [shown?.id, game]);
  const firstTime = !seen.includes(`${game}.intro`);
  const dismiss = () => { if (shown) markSeen(shown.id, `${game}.intro`); };
  return (
    <AnimatePresence initial={false}>
      {shown && (
        // Opacity only: the table resizes once, while quiet, and its cards glide to the new layout.
        <motion.aside key="guide" className="game-guide" aria-label="Nápověda ke hře" data-hint={shown.id}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0 } }} transition={{ duration: reduced ? 0.1 : 0.2 }}>
          <div className="game-guide-inner">
            <BrandMascot state="deal" size={30} reduced={reduced} />
            <p className="game-guide-copy" role="status">
              {firstTime && <span className="game-guide-goal"><span className="type-machine">Cíl</span> {guideGoal(game)}</span>}
              <b>{shown.title}.</b> {shown.text}{' '}
              <button type="button" className="game-guide-off" onClick={() => setGuideOff(game, true)} aria-label={`Nápovědu ke hře ${GAME_INFO[game].name} už nezobrazovat`}>
                V této hře už nezobrazovat
              </button>
            </p>
            <RulesButton gameId={game} compact />
            <button type="button" className="game-guide-close" onClick={dismiss} aria-label="Skrýt nápovědu">×</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

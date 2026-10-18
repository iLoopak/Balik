import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GAME_INFO, type AnyRoomView } from '@balik/shared';
import { BrandMascot } from '../brand/BrandMascot';
import { RulesButton } from '../rules/RulesPanel';
import { useApp } from '../net/store';
import { guideFor, guideGoal, type GuideHint } from './guides';
import { markSeen, setGuideOff, useGuidePrefs } from './preferences';
import './guide.css';

/** A hint must hold this long before it shows, so fast bot turns never flash text. */
const SETTLE_MS = 450;

/**
 * BLIK's short note for the decision in front of the player. It sits in the layout above
 * the table (the table shrinks, nothing is covered), never blocks a click and never waits
 * for or delays the motion director. Each situation is explained once.
 */
export function GameGuide({ room, reduced }: { room: AnyRoomView; reduced: boolean }) {
  const status = useApp((s) => s.status);
  const { off, seen } = useGuidePrefs();
  const game = room.gameId;
  const raw = status === 'open' && !off.includes(game) ? guideFor(room) : null;
  const hint = raw && !seen.includes(raw.id) ? raw : null;
  const [shown, setShown] = useState<GuideHint | null>(null);
  useEffect(() => {
    if (!hint) { setShown(null); return; }
    const timer = setTimeout(() => setShown(hint), SETTLE_MS);
    return () => clearTimeout(timer);
    // The text can change within one situation (e.g. a running total) without a new delay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint?.id]);
  useEffect(() => { if (shown && hint && shown.id === hint.id && shown.text !== hint.text) setShown(hint); }, [hint, shown]);
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
        <motion.aside key="guide" className="game-guide" aria-label="Nápověda ke hře" data-hint={shown.id}
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: reduced ? 0.1 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className="game-guide-inner">
            <BrandMascot state="deal" size={30} reduced={reduced} />
            <p className="game-guide-copy" role="status">
              {firstTime && <span className="game-guide-goal"><span className="type-machine">Cíl</span> {guideGoal(game)}</span>}
              <b>{shown.title}.</b> {shown.text}{' '}
              <button type="button" className="game-guide-off" onClick={() => setGuideOff(game, true)}>
                Nezobrazovat pro {GAME_INFO[game].name}
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

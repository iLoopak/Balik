import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useMotionPref } from './lib/motionPref';
import { roomCodeFromPath, useApp } from './net/store';
import { Home } from './screens/Home';
import { RoomScreen } from './screens/RoomScreen';
import { DeckGallery } from './decks/DeckGallery';
import { GameFeelPlayground } from './effects/GameFeelPlayground';
import { lazy, Suspense, useEffect } from 'react';
import { BrandInteraction } from './brand/BrandInteraction';
import { preloadDeck, useAppearance } from './themes/preferences';
const DeckLab = import.meta.env.DEV ? lazy(() => import('./dev/DeckLab')) : null;
const BrandPlayground = import.meta.env.DEV ? lazy(() => import('./dev/BrandPlayground')) : null;

export function App() {
  const deck = useAppearance(p => p.deck);
  useEffect(() => preloadDeck(deck), [deck]);
  const path = useApp((s) => s.path);
  const toast = useApp((s) => s.toast);
  const { pref } = useMotionPref();
  const code = roomCodeFromPath(path);

  return (
    <MotionConfig reducedMotion={pref === 'reduced' ? 'always' : 'user'}>
      <BrandInteraction />
      {DeckLab && path.replace(/\/$/, '') === '/dev/decks' ? <Suspense fallback={<p>Načítám edice…</p>}><DeckLab /></Suspense> : BrandPlayground && path.replace(/\/$/, '') === '/dev/brand' ? <Suspense fallback={<p>Načítám náhled…</p>}><BrandPlayground /></Suspense> : path.replace(/\/$/, '') === '/dev/deck-stormpunk' ? <DeckGallery /> : path.replace(/\/$/, '') === '/dev/game-feel' ? <GameFeelPlayground /> : code ? <RoomScreen key={code} code={code} /> : <Home />}
      <div className="toast-host" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              className={`toast ${toast.tone}`}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

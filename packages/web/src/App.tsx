import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useMotionPref } from './lib/motionPref';
import { roomCodeFromPath, useApp } from './net/store';
import { Home } from './screens/Home';
import { RoomScreen } from './screens/RoomScreen';
import { DeckGallery } from './decks/DeckGallery';
import { GameFeelPlayground } from './effects/GameFeelPlayground';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrandInteraction } from './brand/BrandInteraction';
import { preloadDeck, useAppearance } from './themes/preferences';
import { galleryDeckFromPath } from './decks/editions';
import { useAppearanceDialog } from './themes/appearanceStore';
// The showroom loads on first open; nobody has to download it to play.
const AppearanceDialog = lazy(() => import('./themes/AppearanceDialog').then((m) => ({ default: m.AppearanceDialog })));
const EditionGallery = lazy(() => import('./decks/EditionGallery'));
const AvatarPlayground = import.meta.env.DEV ? lazy(() => import('./avatars/AvatarPlayground')) : null;
const DeckLab = import.meta.env.DEV ? lazy(() => import('./dev/DeckLab')) : null;
const BrandPlayground = import.meta.env.DEV ? lazy(() => import('./dev/BrandPlayground')) : null;

export function App() {
  const deck = useAppearance((p) => p.deck);
  const path = useApp((s) => s.path);
  const galleryDeck = galleryDeckFromPath(path);
  const assetDeck = galleryDeck
    ? galleryDeck
    : path.replace(/\/$/, '') === '/dev/deck-stormpunk'
      ? 'stormpunk'
      : deck;
  useEffect(() => preloadDeck(assetDeck), [assetDeck]);
  const toast = useApp((s) => s.toast);
  // Mounted on first open and kept, so closing it later still runs the dialog's own close.
  const appearanceOpen = useAppearanceDialog((s) => s.open);
  const [appearanceUsed, setAppearanceUsed] = useState(false);
  useEffect(() => { if (appearanceOpen) setAppearanceUsed(true); }, [appearanceOpen]);
  const { pref } = useMotionPref();
  const code = roomCodeFromPath(path);

  return (
    <MotionConfig reducedMotion={pref === 'reduced' ? 'always' : 'user'}>
      <BrandInteraction />
      {AvatarPlayground && path.replace(/\/$/, '') === '/dev/avatars' ? (
        <Suspense fallback={<p>Načítám postavy…</p>}>
          <AvatarPlayground />
        </Suspense>
      ) : galleryDeck ? (
        <Suspense fallback={<p>Načítám sbírku…</p>}>
          <EditionGallery key={galleryDeck} deck={galleryDeck} />
        </Suspense>
      ) : DeckLab && path.replace(/\/$/, '') === '/dev/decks' ? (
        <Suspense fallback={<p>Načítám edice…</p>}>
          <DeckLab />
        </Suspense>
      ) : BrandPlayground && path.replace(/\/$/, '') === '/dev/brand' ? (
        <Suspense fallback={<p>Načítám náhled…</p>}>
          <BrandPlayground />
        </Suspense>
      ) : path.replace(/\/$/, '') === '/dev/deck-stormpunk' ? (
        <DeckGallery />
      ) : path.replace(/\/$/, '') === '/dev/game-feel' ? (
        <GameFeelPlayground />
      ) : code ? (
        <RoomScreen key={code} code={code} />
      ) : (
        <Home />
      )}
      {appearanceUsed && <Suspense fallback={null}><AppearanceDialog /></Suspense>}
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

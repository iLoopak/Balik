import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useMotionPref } from './lib/motionPref';
import { roomCodeFromPath, useApp } from './net/store';
import { Home } from './screens/Home';
import { RoomScreen } from './screens/RoomScreen';

export function App() {
  const path = useApp((s) => s.path);
  const toast = useApp((s) => s.toast);
  const { pref } = useMotionPref();
  const code = roomCodeFromPath(path);

  return (
    <MotionConfig reducedMotion={pref === 'reduced' ? 'always' : 'user'}>
      {code ? <RoomScreen key={code} code={code} /> : <Home />}
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

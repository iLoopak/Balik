import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { SUITS, SUIT_NAME_CS, type Suit } from '@balik/shared';
import { SuitIcon } from '../cards/SuitIcon';
import { SUIT_TONE } from '../cards/skin';

/**
 * Suit choice for a Q. The play is only sent after a suit is picked, so the
 * action reaching the server is always complete (no half-played Q, no race).
 */
export function SuitPicker({ open, onPick, onCancel }: { open: boolean; onPick: (s: Suit) => void; onCancel: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      const n = Number(e.key);
      if (n >= 1 && n <= 4) onPick(SUITS[n - 1]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onPick]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
        >
          <motion.div
            className="picker"
            role="dialog"
            aria-modal="true"
            aria-label="Vyber novou barvu"
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="picker-title">Svršek: na jakou barvu měníš?</div>
            <div className="picker-grid">
              {SUITS.map((suit, i) => (
                <motion.button
                  key={suit}
                  className="picker-option"
                  style={{ ['--suit-tone' as string]: SUIT_TONE[suit] }}
                  onClick={() => onPick(suit)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i + 0.05, type: 'spring', stiffness: 500, damping: 30 }}
                  whileTap={{ scale: 0.94 }}
                  autoFocus={i === 0}
                >
                  <SuitIcon suit={suit} className="picker-icon" />
                  <span>{SUIT_NAME_CS[suit]}</span>
                </motion.button>
              ))}
            </div>
            <button className="btn btn-ghost picker-cancel" onClick={onCancel}>
              Zpět
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

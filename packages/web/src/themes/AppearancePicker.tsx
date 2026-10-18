import type { GameId } from '@balik/shared';
import { BrandSettings } from '../brand/BrandSettings';
import './appearance.css';
import { AvatarPicker } from '../avatars/AvatarPicker';
import { openAppearance } from './appearanceStore';

/** Composition belongs to settings, keeping brand components edition-independent. */
export function AppSettings({ compact = false, game }: { compact?: boolean; game?: GameId }) {
  return (
    <div className="app-settings">
      <AvatarPicker compact={compact} />
      <BrandSettings compact={compact} />
      <AppearancePicker compact={compact} game={game} />
    </div>
  );
}

/** The Vzhled button. The dialog itself is mounted once, by the app. */
export function AppearancePicker({ compact = false, game }: { compact?: boolean; game?: GameId }) {
  return (
    <button type="button" className="appearance-open" onClick={() => openAppearance(game ?? null)}
      aria-label="Vzhled karet a stolu" aria-haspopup="dialog" title="Vzhled karet a stolu">
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <rect x="7" y="3" width="12" height="17" rx="2" />
        <path d="m6 6-3 1 3 14 10-2m-3-12v6m-3-3h6" />
      </svg>
      {!compact && <span>Vzhled</span>}
    </button>
  );
}

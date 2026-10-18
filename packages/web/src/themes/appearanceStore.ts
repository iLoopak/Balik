import { create } from 'zustand';
import type { GameId } from '@balik/shared';

/** One appearance dialog for the whole app; any button can open it, optionally from a game. */
export const useAppearanceDialog = create<{ open: boolean; game: GameId | null }>(() => ({ open: false, game: null }));
export const openAppearance = (game: GameId | null = null) => useAppearanceDialog.setState({ open: true, game });
export const closeAppearance = () => useAppearanceDialog.setState({ open: false });

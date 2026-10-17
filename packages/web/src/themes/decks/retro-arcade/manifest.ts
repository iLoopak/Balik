import type { Card } from '@balik/shared';
import manifest from './manifest.json';
export interface RetroArcadeCard { card: Card; name: string; meaning: string; archetype: string; stickerAsset: string }
export const RETRO_ARCADE_CARDS = manifest as readonly RetroArcadeCard[];

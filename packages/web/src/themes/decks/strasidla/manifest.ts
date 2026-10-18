import type { Card } from '@balik/shared';
import manifest from './manifest.json';
export interface StrasidlaCard { card: Card; name: string; meaning: string; archetype: string; stickerAsset: string }
export const STRASIDLA_CARDS = manifest as readonly StrasidlaCard[];

import type { Card } from '@balik/shared';
import manifest from './manifest.json';
export interface MariaskyCard { card: Card; name: string; meaning: string; archetype: string; stickerAsset: string }
export const MARIASKY_CARDS = manifest as readonly MariaskyCard[];

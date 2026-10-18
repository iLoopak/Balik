/** Games added after the first three plug in here; see GameModule in games.ts. */
import type { GameModule } from './games';
export type ExtraState = never;
export type ExtraEvent = never;
export type ExtraAction = never;
export type ExtraClientEvent = never;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ExtraViews {}
export const GAME_MODULES_EXTRA: GameModule[] = [];

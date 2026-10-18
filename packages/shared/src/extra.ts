/** Games added after the first three plug in here; see GameModule in games.ts. */
import type { GameModule } from './games';
import { SNAPS_MODULE } from './snaps/module';
import type { SnapsAction, SnapsClientEvent, SnapsEvent, SnapsState, SnapsView } from './snaps/types';

export type ExtraState = SnapsState;
export type ExtraEvent = SnapsEvent;
export type ExtraAction = SnapsAction;
export type ExtraClientEvent = SnapsClientEvent;
export interface ExtraViews { snaps: SnapsView }
export const GAME_MODULES_EXTRA: GameModule[] = [SNAPS_MODULE];

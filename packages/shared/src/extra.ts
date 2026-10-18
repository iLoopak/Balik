/** Games added after the first three plug in here; see GameModule in games.ts. */
import type { GameModule } from './games';
import { SNAPS_MODULE } from './snaps/module';
import { DURAK_MODULE } from './durak/module';
import type { DurakAction, DurakClientEvent, DurakEvent, DurakState, DurakView } from './durak/types';
import type { SnapsAction, SnapsClientEvent, SnapsEvent, SnapsState, SnapsView } from './snaps/types';

export type ExtraState = SnapsState | DurakState;
export type ExtraEvent = SnapsEvent | DurakEvent;
export type ExtraAction = SnapsAction | DurakAction;
export type ExtraClientEvent = SnapsClientEvent | DurakClientEvent;
export interface ExtraViews { snaps: SnapsView; durak: DurakView }
export const GAME_MODULES_EXTRA: GameModule[] = [SNAPS_MODULE, DURAK_MODULE];

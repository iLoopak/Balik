/** Games added after the first three plug in here; see GameModule in games.ts. */
import type { GameModule } from './games';
import { SNAPS_MODULE } from './snaps/module';
import { DURAK_MODULE } from './durak/module';
import { MARIAS_MODULE } from './marias/module';
import type { MariasAction, MariasClientEvent, MariasEvent, MariasState, MariasView } from './marias/types';
import type { DurakAction, DurakClientEvent, DurakEvent, DurakState, DurakView } from './durak/types';
import type { SnapsAction, SnapsClientEvent, SnapsEvent, SnapsState, SnapsView } from './snaps/types';

export type ExtraState = SnapsState | DurakState | MariasState;
export type ExtraEvent = SnapsEvent | DurakEvent | MariasEvent;
export type ExtraAction = SnapsAction | DurakAction | MariasAction;
export type ExtraClientEvent = SnapsClientEvent | DurakClientEvent | MariasClientEvent;
export interface ExtraViews { snaps: SnapsView; durak: DurakView; marias: MariasView }
export const GAME_MODULES_EXTRA: GameModule[] = [SNAPS_MODULE, DURAK_MODULE, MARIAS_MODULE];

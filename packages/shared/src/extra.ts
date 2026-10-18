/** Games added after the first three plug in here; see GameModule in games.ts. */
import type { GameModule } from './games';
import { SNAPS_MODULE } from './snaps/module';
import { DURAK_MODULE } from './durak/module';
import { MARIAS_MODULE } from './marias/module';
import { PETR_MODULE } from './petr/module';
import { OKO_MODULE } from './oko/module';
import { PEXESO_MODULE } from './pexeso/module';
import type { PexesoAction, PexesoClientEvent, PexesoEvent, PexesoState, PexesoView } from './pexeso/types';
import type { OkoAction, OkoClientEvent, OkoEvent, OkoState, OkoView } from './oko/types';
import type { PetrAction, PetrClientEvent, PetrEvent, PetrState, PetrView } from './petr/types';
import type { MariasAction, MariasClientEvent, MariasEvent, MariasState, MariasView } from './marias/types';
import type { DurakAction, DurakClientEvent, DurakEvent, DurakState, DurakView } from './durak/types';
import type { SnapsAction, SnapsClientEvent, SnapsEvent, SnapsState, SnapsView } from './snaps/types';

export type ExtraState = SnapsState | DurakState | MariasState | PetrState | OkoState | PexesoState;
export type ExtraEvent = SnapsEvent | DurakEvent | MariasEvent | PetrEvent | OkoEvent | PexesoEvent;
export type ExtraAction = SnapsAction | DurakAction | MariasAction | PetrAction | OkoAction | PexesoAction;
export type ExtraClientEvent = SnapsClientEvent | DurakClientEvent | MariasClientEvent | PetrClientEvent | OkoClientEvent | PexesoClientEvent;
export interface ExtraViews { snaps: SnapsView; durak: DurakView; marias: MariasView; petr: PetrView; oko: OkoView; pexeso: PexesoView }
export const GAME_MODULES_EXTRA: GameModule[] = [SNAPS_MODULE, DURAK_MODULE, MARIAS_MODULE, PETR_MODULE, OKO_MODULE, PEXESO_MODULE];

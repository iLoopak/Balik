import type { AnyRoomView } from '@balik/shared';
export type AvatarTurn = 'idle' | 'self' | 'thinking';
/** Public authoritative state only; never inspect hands, planned moves or claim truth. */
export function avatarTurn(room: AnyRoomView, playerId: string, online = true): AvatarTurn {
  if (
    !online ||
    room.status !== 'playing' ||
    room.game?.phase !== 'playing' ||
    !room.players.find((p) => p.id === playerId)?.connected ||
    room.game.currentPlayerId !== playerId
  )
    return 'idle';
  return playerId === room.you ? 'self' : 'thinking';
}
export function turnText(turn: AvatarTurn): string {
  return turn === 'self' ? 'Jsi na tahu' : turn === 'thinking' ? 'Přemýšlí…' : '';
}

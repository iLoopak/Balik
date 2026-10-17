/**
 * Dev helper: bots that join a room and play random legal moves.
 *   npm run bot -- ABCD        (one bot)
 *   npm run bot -- ABCD 3      (three bots)
 */
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import { SUITS, legalMovesFromView, chooseSedmaBotFromView, type ClientMessage, type AnyRoomView, type ServerMessage, type Suit } from '@balik/shared';

const code = (process.argv[2] ?? '').toUpperCase();
const count = Number(process.argv[3] ?? 1);
const url = process.env.BALIK_WS ?? 'ws://localhost:8787/ws';
const NAMES = ['Robo Rudla', 'Bot Božka', 'Čip Čeněk'];

if (!/^[A-Z]{4}$/.test(code)) {
  console.error('Použití: npm run bot -- <KÓD MÍSTNOSTI> [počet]');
  process.exit(1);
}

for (let i = 0; i < Math.min(count, 3); i++) runBot(NAMES[i]!);

function runBot(name: string) {
  const token = randomBytes(12).toString('base64url');
  const ws = new WebSocket(url);
  const send = (msg: ClientMessage) => ws.send(JSON.stringify(msg));
  let timer: NodeJS.Timeout | null = null;
  let plannedSeq = -1;

  ws.on('open', () => send({ t: 'join', token, name, code }));
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString()) as ServerMessage;
    if (msg.t === 'error') console.log(`[${name}] ${msg.code}: ${msg.message}`);
    if (msg.t !== 'state') return;
    const room = msg.room;
    if (room.status !== 'playing' || !room.game || room.game.currentPlayerId !== room.you) return;
    if (plannedSeq === room.seq) return;
    plannedSeq = room.seq;
    if (timer) clearTimeout(timer);
    // Leave time for the human's animations to play out.
    timer = setTimeout(() => act(room), 1400 + Math.random() * 900);
  });
  ws.on('close', () => console.log(`[${name}] odpojen`));

  function act(room: AnyRoomView) {
    if (room.gameId === 'sedma' && room.game) { send({ t: 'act', baseSeq: room.seq, action: chooseSedmaBotFromView(room.game, room.you) }); return; }
    if (room.gameId !== 'prsi') return;
    const view = room.game!;
    const moves = legalMovesFromView(view, room.you);
    const hand = view.myHand ?? [];
    if (moves.playable.length) {
      // Prefer non-Q cards; keep the queen as a joker.
      const ids = [...moves.playable].sort((a, b) => Number(a.endsWith('-Q')) - Number(b.endsWith('-Q')));
      const cardId = ids[0]!;
      let chosenSuit: Suit | undefined;
      if (cardId.endsWith('-Q')) {
        const counts = SUITS.map((s) => [s, hand.filter((c) => c.suit === s && c.id !== cardId).length] as const);
        chosenSuit = counts.sort((a, b) => b[1] - a[1])[0]![0];
      }
      send({ t: 'act', baseSeq: room.seq, action: { type: 'play', cardId, chosenSuit } });
    } else if (moves.canPass) {
      send({ t: 'act', baseSeq: room.seq, action: { type: 'pass' } });
    } else if (moves.canDraw) {
      send({ t: 'act', baseSeq: room.seq, action: { type: 'draw' } });
    }
  }
}

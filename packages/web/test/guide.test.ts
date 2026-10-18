import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GAME_IDS, GAME_INFO, applyGameAction, chooseGameBotAction, createGameRound, gameViewFor, mulberry32,
  type AnyRoomView, type GameId, type GameState,
} from '@balik/shared';
import { guideFor, guideGoal } from '../src/guide/guides';
import { GUIDE_KEY, markSeen, parseGuide, setGuideOff, useGuidePrefs } from '../src/guide/preferences';

const roomFor = (gameId: GameId, state: GameState, you: string, players: string[]) => ({
  code: 'TEST', you, hostId: players[0], gameId, status: 'playing', round: 1, seq: 1,
  players: players.map((id) => ({ id, name: `Hráč ${id}`, connected: true })),
  game: gameViewFor(state, you),
}) as unknown as AnyRoomView;

/** Plays bot rounds and asks every seat for its hint after every move. */
function collect(game: GameId, seats: number, seeds = [1, 2, 3]) {
  const ids = new Set<string>();
  for (const seed of seeds) {
    const players = Array.from({ length: seats }, (_, i) => `p${i}`);
    const rng = mulberry32(seed);
    let { state } = createGameRound(game, players, 0, rng);
    for (let step = 0; step < 3000 && (state as { phase: string }).phase !== 'finished'; step++) {
      const current = (state as unknown as { players: { id: string }[]; currentIndex: number });
      const actor = current.players[current.currentIndex]!.id;
      for (const you of players) {
        const room = roomFor(game, state, you, players);
        const hint = guideFor(room);
        if (!hint) continue;
        ids.add(hint.id);
        expect(hint.id.startsWith(`${game}.`), hint.id).toBe(true);
        expect(hint.title.length + hint.text.length).toBeLessThan(260);
        // A hint about a move is only ever shown to the player who has that move.
        if (!/\.(wait|holding)$/.test(hint.id)) expect(you, `${hint.id} shown off-turn`).toBe(actor);
        // Pure: the same authorised view gives the same hint.
        expect(guideFor(JSON.parse(JSON.stringify(room)))).toEqual(hint);
        // Never advice about which card wins.
        expect(hint.text).not.toMatch(/určitě|nejlepší tah|vyhraje/i);
      }
      const result = applyGameAction(state, actor, chooseGameBotAction(state, rng), rng);
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    }
  }
  return ids;
}

describe('contextual game guide', () => {
  it.each(GAME_IDS.map((id) => [id, GAME_INFO[id].players.at(-1)!] as const))('%s explains its decisions from the player view', (game, seats) => {
    const ids = collect(game, seats);
    expect(ids.size, [...ids].join()).toBeGreaterThanOrEqual(2);
    expect(guideGoal(game).length).toBeGreaterThan(10);
  });

  it('covers the complex phases named in the brief', () => {
    const marias = collect('marias', 3, [1, 2, 3, 4, 5]);
    for (const id of ['marias.trump', 'marias.trump.wait', 'marias.declare', 'marias.flek', 'marias.lead', 'marias.follow']) expect(marias).toContain(id);
    const durak = collect('durak', 2);
    for (const id of ['durak.attack', 'durak.defend', 'durak.throw']) expect(durak).toContain(id);
    const lhar = collect('lhar', 3);
    for (const id of ['lhar.claim', 'lhar.respond']) expect(lhar).toContain(id);
    const prsi = collect('prsi', 2, [1, 2, 3, 4, 5, 6]);
    for (const id of ['prsi.play', 'prsi.draw', 'prsi.penalty']) expect(prsi).toContain(id);
    expect(collect('pexeso', 1)).toEqual(new Set(['pexeso.first', 'pexeso.second']));
    expect(collect('oko', 2)).toContain('oko.hit');
    const sedma = collect('sedma', 2);
    for (const id of ['sedma.lead', 'sedma.follow']) expect(sedma).toContain(id);
    expect(collect('snaps', 2)).toContain('snaps.lead');
    expect(collect('petr', 3)).toContain('petr.draw');
  });

  it('a spectator or an empty table gets no hint', () => {
    const { state } = createGameRound('prsi', ['a', 'b'], 0, mulberry32(1));
    const room = roomFor('prsi', state, 'a', ['a', 'b']);
    expect(guideFor({ ...room, you: 'nobody' } as AnyRoomView)).toBeNull();
    expect(guideFor({ ...room, game: null } as AnyRoomView)).toBeNull();
  });
});

describe('guide preferences', () => {
  const storage = new Map<string, string>();
  afterEach(() => { storage.clear(); useGuidePrefs.setState({ off: [], seen: [] }); vi.unstubAllGlobals(); });

  it('sanitises what it reads', () => {
    expect(parseGuide('{"off":["prsi","nope",3,"prsi"],"seen":["prsi.play",1]}')).toEqual({ off: ['prsi'], seen: ['prsi.play'] });
    expect(parseGuide('not json')).toEqual({ off: [], seen: [] });
    expect(parseGuide(null)).toEqual({ off: [], seen: [] });
  });

  it('remembers per game, locally, and starts over when switched back on', () => {
    vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
    markSeen('marias.trump', 'marias.intro', 'prsi.play');
    setGuideOff('marias', true);
    expect(JSON.parse(storage.get(GUIDE_KEY)!)).toEqual({ off: ['marias'], seen: ['marias.trump', 'marias.intro', 'prsi.play'] });
    setGuideOff('marias', false);
    expect(useGuidePrefs.getState()).toEqual({ off: [], seen: ['prsi.play'] });
  });

  it('counts the older Lhář and Sedma intros as already met', async () => {
    storage.set('balik.lhar.intro', '1');
    vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
    vi.resetModules();
    const fresh = await import('../src/guide/preferences');
    expect(fresh.useGuidePrefs.getState().seen).toEqual(['lhar.intro']);
  });
});

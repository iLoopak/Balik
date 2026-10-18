import { expect } from 'vitest';
import { applyGameAction, chooseGameBotAction, createGameRound, filterGameEventFor, gameViewFor, gameWinnerIds, mulberry32, type GameId, type GameState } from '../../src';

/**
 * Plays whole rounds with the built-in bots through the public dispatcher and checks, after every
 * step, that no viewer's snapshot or filtered events contain a card id that is secret to them.
 */
export function playthrough(game: GameId, players: string[], seed: number, secret: (state: GameState, viewer: string) => string[], maxSteps = 3000) {
  const rng = mulberry32(seed);
  let { state, events } = createGameRound(game, players, seed % players.length, rng);
  const check = (s: GameState, evs: typeof events) => {
    for (const viewer of players) {
      const hidden = secret(s, viewer);
      const view = JSON.stringify(gameViewFor(s, viewer));
      const filtered = JSON.stringify(evs.map((e) => filterGameEventFor(e, viewer)));
      for (const id of hidden) {
        expect(view, `${game} view for ${viewer} leaks ${id}`).not.toContain(`"${id}"`);
        expect(filtered, `${game} events for ${viewer} leak ${id}`).not.toContain(`"${id}"`);
      }
    }
  };
  check(state, events);
  let steps = 0;
  while ((state as { phase: string }).phase !== 'finished') {
    if (++steps > maxSteps) throw new Error(`${game} did not finish in ${maxSteps} steps (seed ${seed})`);
    const actor = (state as { players: { id: string }[]; currentIndex: number }).players[(state as { currentIndex: number }).currentIndex]!.id;
    const action = chooseGameBotAction(state, rng);
    const result = applyGameAction(state, actor, action, rng);
    if (!result.ok) throw new Error(`${game} bot made an illegal move (${JSON.stringify(action)}): ${result.error}`);
    state = result.state; events = result.events;
    check(state, events);
  }
  return { state, winners: gameWinnerIds(state), steps };
}

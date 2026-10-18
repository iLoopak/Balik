import {
  durakLegalFromView, legalMovesFromView, mariasLegalFromView, okoLegalFromView, pexesoLegalFromView, petrLegalFromView,
  sedmaLegalFromView, snapsLegalFromView, PETR_CARD_ID, type AnyRoomView, type GameId,
} from '@balik/shared';
import { cardText, rankLabel, suitName } from '../cards/skin';
import { RULES } from '../rules/rules';

/**
 * One hint for the moment of decision. Hints read only the player's own authorised view
 * and the engine's legal-move helpers, so they can never reveal anybody else's cards and
 * never guess a move the server would refuse. They explain the decision; they never
 * recommend a card.
 */
export interface GuideHint {
  /** Stable per situation (not per turn): each one is explained once. */
  id: string;
  title: string;
  text: string;
}

/** The goal of the game, shown with the first hint a player meets in it. */
export const guideGoal = (game: GameId) => RULES[game]?.goal ?? '';

type Ctx<G extends GameId> = { view: NonNullable<Extract<AnyRoomView, { gameId: G }>['game']>; me: string; name: (id: string) => string };
type Guides = { [G in GameId]: (ctx: Ctx<G>) => GuideHint | null };

const petrName = () => `Černý Petr (${cardText({ id: PETR_CARD_ID, suit: 'spades', rank: 'J' })})`;

const GUIDES: Guides = {
  prsi: ({ view, me }) => {
    const legal = legalMovesFromView(view, me);
    if (view.phase !== 'playing' || view.currentPlayerId !== me) return null;
    if (view.drawnCardId) return legal.playable.length
      ? { id: 'prsi.drawn', title: 'Líznutá karta sedí', text: 'Můžeš ji hned zahrát. Když nechceš, dej Nehraju a tah končí.' }
      : { id: 'prsi.pass', title: 'Líznutá karta nesedí', text: 'Dej Nehraju a na tahu je další hráč.' };
    if (view.pendingDraw > 0) return {
      id: 'prsi.penalty', title: `Sedma! Bereš ${view.pendingDraw}`,
      text: legal.playable.length ? 'Přilož vlastní sedmu a trest se zvětší pro dalšího hráče. Jinak si lízni trestné karty.' : 'Sedmu nemáš, takže si trestné karty lízneš. Tah tím končí.',
    };
    if (!legal.playable.length) return { id: 'prsi.draw', title: 'Nemáš co přiložit', text: 'Lízni si kartu. Když sedí, můžeš ji hned zahrát.' };
    return {
      id: 'prsi.play', title: 'Jsi na tahu',
      text: `Přilož kartu stejné barvy nebo hodnoty. Zvýrazněné karty jdou zahrát. Svršek (${rankLabel('Q')}) jde skoro na cokoli a určí novou barvu.`,
    };
  },
  sedma: ({ view, me }) => {
    if (!sedmaLegalFromView(view, me).length) return null;
    const lead = view.leadRank ? rankLabel(view.leadRank) : '';
    if (view.deciding) return { id: 'sedma.decide', title: 'Vzít štych, nebo hrát dál?', text: `Štych můžeš ukončit, nebo přidat sedmu či kartu ${lead} a pokračovat o body.` };
    if (!view.trick.length) return { id: 'sedma.lead', title: 'Vynášíš', text: 'Hodnota tvé karty určí štych. Přebít ho jde jen stejnou hodnotou nebo sedmou. Body nesou esa a desítky.' };
    return { id: 'sedma.follow', title: 'Přebij, nebo přihoď', text: `Štych bere poslední karta ${lead} nebo sedma. Barva nehraje roli.` };
  },
  lhar: ({ view, me, name }) => {
    if (view.phase !== 'playing' || view.currentPlayerId !== me) return null;
    const claim = view.lastClaim;
    if (claim && claim.playerId !== me && view.history.at(-1)?.outcome === 'pending') return {
      id: 'lhar.respond', title: 'Věříš tvrzení?',
      text: `${name(claim.playerId)} tvrdí ${claim.count}× ${rankLabel(claim.rank)}. Pokračuj vlastními kartami, nebo řekni LHÁŘ! Odhalí se jen poslední sada.`,
    };
    return { id: 'lhar.claim', title: 'Polož karty rubem', text: `Vyber 1–4 karty a prohlas je za ${rankLabel(view.requiredRank)}. Pravda to být nemusí, další hráč ale může tvrzení zpochybnit.` };
  },
  snaps: ({ view, me }) => {
    const legal = snapsLegalFromView(view, me);
    if (!legal.length) return null;
    if (legal.some((a) => a.type === 'snapsExchange')) return { id: 'snaps.exchange', title: 'Můžeš vyměnit devítku', text: 'Máš trumfovou devítku. Vyměň ji za otočený trumf pod talonem.' };
    if (!view.trick.length && legal.some((a) => a.type === 'snapsPlay' && a.marriage)) return {
      id: 'snaps.marriage', title: 'Máš hlášku', text: `Krále a svrška stejné barvy ohlásíš vynesením jednoho z nich: 20 bodů, v trumfech (${suitName(view.trump).toLowerCase()}) 40.`,
    };
    if (view.strict) return { id: 'snaps.strict', title: 'Talon je zavřený', text: 'Teď musíš přiznat barvu a přebít, když to jde. Nemáš barvu? Musíš trumfovat.' };
    if (!view.trick.length) return {
      id: 'snaps.lead', title: 'Vynášíš',
      text: `Hraje se do 66 bodů: eso 11, desítka 10, král 4, svršek 3, spodek 2. Trumf je ${suitName(view.trump).toLowerCase()}.${legal.some((a) => a.type === 'snapsClose') ? ' Máš-li na 66, můžeš talon zavřít.' : ''}`,
    };
    return { id: 'snaps.follow', title: 'Odpovídáš', text: 'Talon je otevřený, můžeš hrát cokoli. Štych bere vyšší karta vynesené barvy, nebo trumf.' };
  },
  durak: ({ view, me }) => {
    if (!durakLegalFromView(view, me).length) return null;
    const trump = suitName(view.trump).toLowerCase();
    if (view.role === 'defend') return { id: 'durak.defend', title: 'Braň se', text: `Přebij útok vyšší kartou stejné barvy, nebo trumfem (${trump}). Nejde to? Dej Beru a vezmeš všechno ze stolu.` };
    if (!view.table.length) return { id: 'durak.attack', title: 'Útočíš', text: 'Vynes libovolnou kartu. Obránce ji musí přebít, jinak bere.' };
    return { id: 'durak.throw', title: 'Přihoď, nebo dost', text: 'Přihodit smíš jen hodnotu, která už na stole leží. Když nechceš, dej Stačí.' };
  },
  marias: ({ view, me, name }) => {
    const mine = mariasLegalFromView(view, me).length > 0;
    if (view.phase === 'choosingTrump') return mine
      ? { id: 'marias.trump', title: 'Jsi volič', text: 'Ze svých 7 karet vyber jednu. Její barva bude trumf. Pak dobereš zbytek karet a 2 odhodíš do talonu.' }
      : { id: 'marias.trump.wait', title: `${name(view.declarerId)} volí trumf`, text: 'Hraješ v obraně se druhým soupeřem. Společně se snažíte, aby sázka voliče nevyšla.' };
    // The discard is a free choice of two cards, so the engine lists no single legal action here.
    if (view.phase === 'declaring' && view.currentPlayerId === me) return {
      id: 'marias.declare', title: 'Odhoď 2 karty a zvol hru',
      text: 'Hra: víc bodů než obrana. Kilo: trumfová hláška a 60 ze štychů. Betl: žádný štych. Durch: všechny štychy.',
    };
    if (view.phase === 'flek' && mine) return { id: 'marias.flek', title: 'Flek, nebo dobrý?', text: 'Flek zdvojnásobí sázku. Když věříš, že sázka nevyjde, flekuj. Jinak dej Dobrý.' };
    if (view.phase !== 'playing' || !mine) return null;
    if (!view.trick.length) return { id: 'marias.lead', title: 'Vynášíš', text: 'Ostatní musí přiznat barvu, přebít, když to jde, a jinak trumfovat. Krále se svrškem stejné barvy hlásíš vynesením.' };
    return { id: 'marias.follow', title: 'Přiznej a přebij', text: 'Zvýrazněné karty jsou ty, které ti pravidla teď dovolí.' };
  },
  petr: ({ view, me, name }) => {
    if (petrLegalFromView(view, me).length) return { id: 'petr.draw', title: 'Táhni naslepo', text: `Vytáhni jednu kartu od hráče ${name(view.targetId)}. Dvojice se odloží samy. Hlavně ať ti nezůstane ${petrName()}.` };
    // Only my own hand: holding the Petr is something I already know.
    if (view.phase === 'playing' && view.myHand?.some((c) => c.id === PETR_CARD_ID)) return { id: 'petr.holding', title: 'Petr je u tebe', text: 'Nikdo jiný to neví. Až si od tebe soused potáhne, třeba si ho vezme.' };
    return null;
  },
  oko: ({ view, me }) => {
    if (!okoLegalFromView(view, me).length) return null;
    if (view.bankId === me) return { id: 'oko.bank', title: 'Hraješ za bank', text: `Bankéř hraje poslední${view.myTotal !== null ? ` a máš ${view.myTotal}` : ''}. Shoda je pro tebe, přes 21 prohráváš.` };
    return { id: 'oko.hit', title: 'Ještě kartu, nebo stojíš?', text: `${view.myTotal !== null ? `Máš ${view.myTotal}. ` : ''}Přes 21 prohráváš ruku. Dvě esa jsou oko a porazí všechno.` };
  },
  pexeso: ({ view, me }) => {
    if (!pexesoLegalFromView(view, me).length) return null;
    return view.board.some((s) => s?.state === 'up')
      ? { id: 'pexeso.second', title: 'Najdi dvojici', text: 'Otoč druhou kartu. Stejná hodnota a stejná barva (červená, nebo černá) je dvojice a hraješ znovu.' }
      : { id: 'pexeso.first', title: 'Otoč kartu', text: 'Otoč libovolnou skrytou kartu a zapamatuj si ji. Pak hledáš její dvojici.' };
  },
};

/** The hint for this moment, or null when there is nothing to decide. */
export function guideFor(room: AnyRoomView): GuideHint | null {
  if (!room.game || !room.players.some((p) => p.id === room.you)) return null;
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Soupeř';
  const guide = GUIDES[room.gameId] as (ctx: Ctx<GameId>) => GuideHint | null;
  return guide({ view: room.game as Ctx<GameId>['view'], me: room.you, name });
}

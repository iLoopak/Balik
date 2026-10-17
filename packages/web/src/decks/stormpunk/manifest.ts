import { RANKS, type Card, type Rank } from '@balik/shared';
import { FACTIONS, FACTION_IDS, SUIT_FACTION, type FactionId } from './tokens';

export interface StormpunkCard {
  id: `stormpunk:${FactionId}:${Rank}`;
  faction: FactionId;
  rank: Rank;
  name: string;
  archetype: string;
  stickerAsset: string;
  scale: number;
  offset: [number, number];
  card: Card;
}

export const ARCHETYPES: Record<Rank, string> = {
  '7': 'Riziko', '8': 'Obrana', '9': 'Strážce', '10': 'Dominanta',
  J: 'Běžec', Q: 'Kapitánka', K: 'Vůdce', A: 'Esence',
};

const NAMES: Record<FactionId, Record<Rank, string>> = {
  vyhen: {
    '7': 'Přetížená baterie', '8': 'Tepelný štít', '9': 'Ohnivý hlídací modul', '10': 'Městský reaktor',
    J: 'Technik s cívkou', Q: 'Velitelka energetické směny', K: 'Správce reaktoru', A: 'Plamenné jádro',
  },
  pohyb: {
    '7': 'Rozbitý urychlovač', '8': 'Ochranná bariéra', '9': 'Magnetický střešní kurýr', '10': 'Centrální dopravní uzel',
    J: 'Kurýr na boardu', Q: 'Kapitánka kurýrní sítě', K: 'Architekt městského pohybu', A: 'Rychlostní uzel',
  },
  podrost: {
    '7': 'Kořenová past', '8': 'Živý kořenový val', '9': 'Černá střešní kočka', '10': 'Strom prorůstající věží',
    J: 'Střešní scout', Q: 'Vůdkyně rooftop kolonie', K: 'Hlas živého města', A: 'Živé oko',
  },
  boure: {
    '7': 'Kulový blesk', '8': 'Elektrická dešťová clona', '9': 'Bouřný pták', '10': 'Meteorologická věž',
    J: 'Bouřný běžec', Q: 'Velitelka meteorologů', K: 'Mistr bouřkové věže', A: 'Srdce bouře',
  },
};

export const STORMPUNK_CARDS: readonly StormpunkCard[] = FACTION_IDS.flatMap((faction) =>
  RANKS.map((rank): StormpunkCard => ({
    id: `stormpunk:${faction}:${rank}`, faction, rank,
    name: NAMES[faction][rank], archetype: ARCHETYPES[rank],
    stickerAsset: `/decks/stormpunk/stickers/${faction}/${rank.toLowerCase()}.webp`,
    scale: 1, offset: [0, 0],
    card: { id: `${FACTIONS[faction].suit}-${rank}`, suit: FACTIONS[faction].suit, rank },
  })),
);

const REGISTRY = new Map(STORMPUNK_CARDS.map((entry) => [entry.id, entry]));

/** Presentation mapping only: the engine and wire protocol continue to use the classic suits. */
export function stormpunkFor(card: Card): StormpunkCard {
  return REGISTRY.get(`stormpunk:${SUIT_FACTION[card.suit]}:${card.rank}`)!;
}

import { RANKS, SUITS, type Card, type Rank } from '@balik/shared';
import { DECK_THEMES, type DeckId, type TableId } from '../themes/registry';
import { RETRO_ARCADE_CARDS } from '../themes/decks/retro-arcade/manifest';
import { MARIASKY_CARDS } from '../themes/decks/mariasky/manifest';
import { STRASIDLA_CARDS } from '../themes/decks/strasidla/manifest';
import { COLLECTION_GALLERIES, type CollectionDeckId } from '../themes/decks/collections.generated';

export interface EditionCard { card: Card; name: string; meaning: string; archetype: string }
export interface EditionCopy {
  number: string;
  title: [string, string];
  intro: [string, string];
  /** What the four suits are called in this edition: "BARVY", "SVĚTY"… */
  suitsLabel: string;
  collectionTitle: string;
  artNote: [string, string];
  table?: TableId;
  /** Rank shown fanned in the hero; defaults to the jacks. */
  heroRank?: Rank;
  cards: readonly EditionCard[];
}

const RANK_NAME: Record<Rank, string> = { '7': 'Sedma', '8': 'Osma', '9': 'Devítka', '10': 'Desítka', J: 'Kluk', Q: 'Dáma', K: 'Král', A: 'Eso' };
const KONTRAST_PATTERN = { hearts: 'Plné srdce', diamonds: 'Káry s pruhy', clubs: 'Kříže s kroužky', spades: 'Plné piky' } as const;
// Kontrast has no illustrations; each card is its index and its patterned suit.
const KONTRAST_CARDS: EditionCard[] = SUITS.flatMap(suit => RANKS.map(rank => ({
  card: { id: `${suit}-${rank}`, suit, rank },
  name: `${RANK_NAME[rank]} · ${DECK_THEMES.kontrast.suits[suit].name}`,
  archetype: KONTRAST_PATTERN[suit],
  meaning: `${KONTRAST_PATTERN[suit]} a velký index. Barvu poznáš i bez barvy.`,
})));

/** Public collections at /decks/<id>; Stormpunk keeps its own page. */
export type GalleryDeckId = Extract<DeckId, 'retro-arcade' | 'mariasky' | 'strasidla' | 'kontrast'> | CollectionDeckId;
export const GALLERY_EDITIONS: Record<GalleryDeckId, EditionCopy> = {
  ...COLLECTION_GALLERIES,
  'retro-arcade': {
    number: '002', title: ['Ještě jednu', 'partii.'], suitsLabel: 'BARVY', table: 'retro-arcade',
    intro: ['Retro Arcade. Čtyři barvy, třicet dva charakterů.', 'Od prvního glitchu až po posledního bosse.'],
    collectionTitle: 'Celá herna v ruce', artNote: ['MALÝ STICKER.', 'VELKÝ CHARAKTER.'], cards: RETRO_ARCADE_CARDS,
  },
  mariasky: {
    number: '003', title: ['Mariáš', 'po novu.'], suitsLabel: 'BARVY',
    intro: ['Mariášky. Srdce, kule, listy a žaludy.', 'Moderní linoryt české hospody.'],
    collectionTitle: 'Celý mariášový balík', artNote: ['ČESKÉ BARVY.', 'NOVÝ ŘEZ.'], cards: MARIASKY_CARDS,
  },
  strasidla: {
    number: '004', title: ['Kdo se', 'bojí?'], suitsLabel: 'SVĚTY',
    intro: ['Strašidla. Čtyři světy, třicet dva bytostí.', 'Čerti, bludičky, hejkalové a vodníci.'],
    collectionTitle: 'Všechna strašidla pohromadě', artNote: ['SVÍTÍCÍ OČI.', 'DOBRÁ PARTIE.'], cards: STRASIDLA_CARDS,
  },
  kontrast: {
    number: '005', title: ['Čitelné', 'na první pohled.'], suitsLabel: 'BARVY',
    intro: ['Kontrast. Velké indexy a vzorované symboly.', 'Barvy čitelné i pro barvoslepé.'],
    collectionTitle: 'Každá karta jasně', artNote: ['VELKÝ INDEX.', 'JASNÝ VZOR.'], heroRank: 'A', cards: KONTRAST_CARDS,
  },
};

export function galleryDeckFromPath(path: string): GalleryDeckId | null {
  const id = /^\/decks\/([a-z0-9-]+)\/?$/.exec(path)?.[1];
  return id && Object.hasOwn(GALLERY_EDITIONS, id) ? (id as GalleryDeckId) : null;
}
export const editionHref = (id: DeckId) => (Object.hasOwn(GALLERY_EDITIONS, id) ? `/decks/${id}` : id === 'stormpunk' ? '/dev/deck-stormpunk' : null);

import { AVATAR_IDS, defaultAvatarId, isAvatarId, type AvatarId } from '@balik/shared';
export interface AvatarDefinition {
  id: AvatarId;
  name: string;
  type: 'player' | 'bot';
  asset: string;
  themeColor: string;
  tags: readonly string[];
  unlocked: true;
}
const details: Record<AvatarId, [string, string, string]> = {
  vega: ['Vega', '#f4b544', 'Odvážná'],
  bruno: ['Bruno', '#7ba4bf', 'Klid u stolu'],
  jiskra: ['Jiskra', '#d98373', 'Drzá energie'],
  sova: ['Sova', '#d6bc78', 'Analytik'],
  sibr: ['Šíbr', '#a68ab5', 'Stará škola'],
  mlzka: ['Mlžka', '#a79ac9', 'Tajemná'],
  sotek: ['Šotek', '#99ba8b', 'Chaos s úsměvem'],
  luna: ['Luna', '#d49b79', 'Dobrá nálada'],
  nula: ['Nula', '#8caeab', 'Přesný tah'],
  kocour: ['Kocour', '#9ba6bb', 'Nenápadný stratég'],
  kika: ['Kika', '#d6976a', 'Rychlé rozhodnutí'],
  rys: ['Rys', '#c7a978', 'Tichý pozorovatel'],
  vedma: ['Vědma', '#b9a2b1', 'Čte mezi tahy'],
  zefyr: ['Zefýr', '#7da9a5', 'V pohodě'],
  gambit: ['Gambit', '#ae9694', 'Risk s rozvahou'],
  mina: ['Mína', '#c7ad71', 'Ostrý postřeh'],
  'bot-rudla': ['Robo Rudla', '#c9a669', 'Přátelský'],
  'bot-bozka': ['Bot Božka', '#bb929d', 'Rozvážný'],
  'bot-cenek': ['Čip Čeněk', '#91b5b3', 'Analytický'],
  'bot-kveta': ['Kyber Květa', '#b5a3c7', 'Hravý'],
};
export const AVATAR_CATALOG: readonly AvatarDefinition[] = AVATAR_IDS.map((id) => ({
  id,
  name: details[id][0],
  themeColor: details[id][1],
  tags: [details[id][2]],
  type: id.startsWith('bot-') ? 'bot' : 'player',
  asset: `/avatars/${id}.webp`,
  unlocked: true,
}));
export function avatarFor(id: unknown, playerId: string, bot = false): AvatarDefinition {
  return AVATAR_CATALOG.find((a) => a.id === (isAvatarId(id) ? id : defaultAvatarId(playerId, bot)))!;
}

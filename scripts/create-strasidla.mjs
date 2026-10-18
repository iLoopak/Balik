// Original BALÍK "Strašidla" edition: Czech folk creatures as flat paper puppets.
// No licensed characters, scans or fonts. Ink outline, flat suit colour, glowing eyes.
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = 'packages/web/public/decks/strasidla';
mkdirSync(`${dir}/stickers`, { recursive: true });

const ink = '#231C2E', paper = '#FFF8EC', glow = '#FFE36E', gold = '#F2B33D';
const S = {
  hearts: { name: 'Oheň', c: '#D9432B', a: '#F28C28', d: '#7A1E14' },
  diamonds: { name: 'Noc', c: '#6C4BC2', a: '#B9A4F0', d: '#352263' },
  clubs: { name: 'Les', c: '#4E8A3A', a: '#A3C764', d: '#5E4128' },
  spades: { name: 'Voda', c: '#1F8E9E', a: '#8FD6DA', d: '#145E6B' },
};
const P = (d, fill = paper, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const C = (x, y, r, fill = paper) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const E = (x, y, rx, ry, fill = paper) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const line = (d, w) => `<path d="${d}" fill="none"${w ? ` stroke-width="${w}"` : ''}/>`;
const cut = (d, color = paper, w = 3) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
/** Glowing creature eyes: the one constant across all four worlds. */
const eyes = (x, y, gap = 22, r = 8) => [x, x + gap].map(ex => C(ex, y, r, glow) + `<circle cx="${ex + 1}" cy="${y + 1}" r="${r * 0.4}" fill="${ink}" stroke="none"/>`).join('');
/** Every Q holds a will-o'-wisp lantern: it leads the game into another suit. */
const lantern = (x, y, col) => line(`M${x} ${y - 46}v18`, 4) + P(`M${x - 14} ${y - 28}h28l-4 34h-20Z`, ink) + P(`M${x - 8} ${y - 22}h16l-2 22h-12Z`, glow) + P(`M${x} ${y - 18}q6 6 0 12-6-4 0-12Z`, col, 'stroke-width="2"') + P(`M${x - 16} ${y + 6}h32v6h-32Z`, ink);
const coins = (pts) => pts.map(([x, y]) => C(x, y, 9, gold) + line(`M${x - 3} ${y}h6`, 2.5)).join('');
const sparkle = (x, y, s = 8) => P(`M${x} ${y - s}l${s * 0.3} ${s * 0.7} ${s * 0.7} ${s * 0.3}-${s * 0.7} ${s * 0.3}-${s * 0.3} ${s * 0.7}-${s * 0.3}-${s * 0.7}-${s * 0.7}-${s * 0.3} ${s * 0.7}-${s * 0.3}Z`, glow, 'stroke-width="2.5"');

const cards = {
  hearts: ({ c, a, d }) => ({
    '7': ['Ohnivák', 'Ohnivý pták se střemhlav vrhá do hry.', P('M78 108q-46-22-58-62 30 12 46 6-14-22-4-42 22 30 46 46Z', a) + P('M74 118q-38 6-58-12 26-2 36-14Z', c) + `<ellipse cx="128" cy="140" rx="64" ry="38" transform="rotate(30 128 140)" fill="${c}"/>` + P('M110 124q-12-72 52-86-6 40 12 62-34-8-64 24Z', a) + C(184, 178, 26, c) + C(192, 172, 8, glow) + `<circle cx="194" cy="173" r="3.5" fill="${ink}" stroke="none"/>` + P('M206 188l28 18-32-2Z', gold) + cut('M102 150q24 14 52 10', a, 4)],
    '8': ['Uhlíček', 'Kulatý uhlík s doutnajícími prasklinami.', C(128, 140, 66, d) + cut('M84 120l26 18-8 22 30 12M150 98l-6 26 24 14M140 196l10-24 24-6', a, 5) + P('M92 84l-10-28 28 18Zm72 0 10-28-28 18Z', c) + eyes(106, 132)],
    '9': ['Smolníček', 'Kapající smolný skřítek, co se lepí na karty.', P('M70 196V120q0-56 58-56t58 56v76q-10 18-18 0-8 22-18 0-8 26-22 0-10 20-18 0-10 18-22 0-8 16-18 0Z', d) + P('M104 70q-4-20 10-28 2 18-10 28Zm48 0q4-20-10-28-2 18 10 28Z', c) + eyes(106, 122) + line('M112 158q16 10 32 0', 4)],
    '10': ['Pekelný pokladník', 'Čertík hlídá měšec plný bodů.', P('M80 210q-6-60 48-62 54 2 48 62Z', c) + C(128, 110, 36, c) + P('M100 84l-12-30 26 20Zm56 0 12-30-26 20Z', d) + eyes(116, 104, 24, 7) + P('M140 160q40-6 46 30 2 28-30 26-30-4-24-34Z', gold) + line('M150 164q12-12 22 0', 4) + coins([[74, 196], [190, 116], [208, 150]]) + sparkle(64, 150)],
    J: ['Čertík', 'Mladý čert s vidlemi a ocasem na pérku.', P('M92 214l6-70q30-18 60 0l6 70Z', c) + C(128, 104, 34, c) + P('M104 80l-10-30 24 18Zm48 0 10-30-24 18Z', d) + eyes(116, 98, 24, 7) + line('M118 124q10 8 20 0', 3.5) + line('M190 220V56', 6) + P('M174 52v-16l8 12 8-16 8 16 8-12v16Z', d) + line('M92 190q-40 0-40-30 0-12 12-12', 5) + P('M60 146l-10-10 16 2Z', d)],
    Q: ['Ohnivá žínka', 'Plamenné vlasy a bludná lucerna mění barvu hry.', P('M84 218l10-80q34-20 68 0l10 80Z', c) + P('M80 120q-6-60 48-72 54 12 48 72-12-20-20-8-8-26-28-12-20-14-28 12-8-12-20 8Z', a) + C(128, 108, 26) + eyes(117, 104, 22, 5) + line('M120 124q8 6 16 0', 3) + lantern(196, 150, c)],
    K: ['Lucifer', 'Pán pekla s korunou mezi rohy a trojzubcem.', P('M64 222l14-84q50-26 100 0l14 84Z', d) + P('M104 222l4-70 20 24 20-24 4 70Z', c) + C(128, 100, 36, c) + P('M98 76 78 36l34 26Zm60 0 20-40-34 26Z', d) + P('M106 66l4-22 10 12 8-16 8 16 10-12 4 22Z', gold) + eyes(114, 98, 28, 7) + P('M108 122q20 22 40 0-6 18-20 18-14 0-20-18Z', d) + line('M48 226V60', 6) + P('M36 64V44l6 10 6-16 6 16 6-10v20Z', gold)],
    A: ['Pekelný kotel', 'Víko zaklapne: kotel zastaví každý tah.', P('M56 112h144q0 76-72 82-72-6-72-82Z', ink) + P('M48 104h160v14H48Z', d) + P('M96 104q32-30 64 0Z', d) + C(128, 84, 7, gold) + P('M74 214q8-24 18 0 6-28 18 0 8-30 20 0 6-28 18 0 8-24 18 0Z', a) + cut('M80 136h96M86 156h84', c, 4) + line('M44 118l-10 20M212 118l10 20', 5)],
  }),
  diamonds: ({ c, a, d }) => ({
    '7': ['Můra', 'Noční můra se snáší střemhlav na hráče.', P('M128 70q-70-30-92 30 40 4 60 26-50 10-46 52 44-6 70-46Z', c) + P('M128 70q70-30 92 30-40 4-60 26 50 10 46 52-44-6-70-46Z', c) + E(128, 120, 14, 50, d) + C(84, 108, 12, a) + C(172, 108, 12, a) + line('M120 72l-16-30M136 72l16-30', 4) + eyes(118, 88, 20, 6)],
    '8': ['Netopýr', 'Rozpjatá křídla, uši nastražené na každý tah.', P('M128 104q-40-20-96 0 18 14 18 36 18-14 34-2 6-18 22-12Z', c) + P('M128 104q40-20 96 0-18 14-18 36-18-14-34-2-6-18-22-12Z', c) + C(128, 124, 30, d) + P('M106 102l-6-28 18 14Zm44 0 6-28-18 14Z', d) + eyes(116, 118, 24, 7) + P('M120 140l4 8 4-8 4 8 4-8', 'none', `stroke="${paper}" stroke-width="3"`)],
    '9': ['Půlnoční kocour', 'Černý kocour s měsíčníma očima sedí na střeše.', P('M80 214q-10-60 20-90-10-40 6-60l20 28h12l20-28q16 20 6 60 30 30 20 90Z', d) + P('M176 206q40-10 30-54', 'none', 'stroke-width="12"') + line('M176 206q40-10 30-54', 6) + eyes(110, 112, 36, 10) + P('M124 138l4 6 4-6Z', a) + P('M196 54q-22 10-14 32 16 6 30-6-18 0-16-26Z', glow)],
    '10': ['Hvězdný poklad', 'Truhla plná hvězd: deset bodů ve štychu.', P('M58 136h140v74H58Z', d) + P('M58 136q0-46 70-46t70 46Z', c) + P('M58 136h140v14H58Z', a) + P('M116 150h24v22h-24Z', gold) + sparkle(96, 72, 12) + sparkle(160, 62, 14) + sparkle(128, 40, 10) + sparkle(196, 96, 9) + sparkle(62, 100, 9)],
    J: ['Strašidýlko', 'Malé prostěradlové strašidlo, co jen dělá baf.', P('M76 220V112q0-60 52-60t52 60v108l-18-16-16 16-18-16-18 16-16-16Z', paper) + eyes(106, 108, 30, 9) + E(128, 146, 10, 14, ink) + line('M66 136l-20 10M190 136l20 10', 5)],
    Q: ['Bludička', 'Svítí na cestu, a přece tě svede jinou barvou.', P('M128 40q40 40 30 90-4 30-30 50-26-20-30-50-10-50 30-90Z', a) + P('M128 70q22 26 16 60-4 18-16 28-12-10-16-28-6-34 16-60Z', glow) + P('M92 222q10-50 36-46 26-4 36 46Z', c) + eyes(116, 116, 24, 5) + lantern(196, 156, c)],
    K: ['Bezhlavý rytíř', 'Půlnoční pán nese hlavu v podpaží a meč u boku.', P('M70 226l12-106q46-24 92 0l12 106Z', d) + E(84, 120, 22, 15, c) + E(172, 120, 22, 15, c) + E(128, 100, 20, 9, '#8E2A3A') + cut('M128 112v110M98 146h60M100 176h56', a, 4) + line('M172 126l20 36', 18) + `<path d="M172 126l20 36" stroke="${d}" stroke-width="10"/>` + C(196, 176, 24, paper) + eyes(185, 172, 20, 5) + line('M188 190q8 6 16 0', 3) + P('M178 154l4-14 12 8 10-10 4 16Z', gold) + line('M50 226V96', 7) + P('M36 112h28v8H36Z', gold)],
    A: ['Půlnoční hodiny', 'Odbila dvanáctá: všechno se zastaví.', C(128, 128, 82, d) + C(128, 128, 64, paper) + line('M128 128V78M128 128V92', 7) + C(128, 128, 7, ink) + [0, 1, 2, 3].map(i => line(`M${128 + 52 * Math.cos(i * Math.PI / 2)} ${128 + 52 * Math.sin(i * Math.PI / 2)}l${4 * Math.cos(i * Math.PI / 2)} ${4 * Math.sin(i * Math.PI / 2)}`, 6)).join('') + P('M196 44q-26 10-16 36 18 6 34-8-20 0-18-28Z', glow) + P('M110 212h36v20h-36Z', c)],
  }),
  clubs: ({ c, a, d }) => ({
    '7': ['Kořenáč', 'Kořenová bytost vyráží drápy proti hráčům.', P('M84 210q-14-70 20-110 40-36 76-4 30 40 6 114Z', d) + P('M104 100q-30-40-60-30 26 6 34 30Zm68-6q20-44 52-40-22 10-30 36Z', c) + P('M86 170l-40-20 30 34-34 6 44 6Zm84 0 40-20-30 34 34 6-44 6Z', d) + eyes(110, 140, 34, 8) + P('M114 176l8 10 6-10 6 10 8-10', 'none', `stroke="${paper}" stroke-width="3"`)],
    '8': ['Mechová žába', 'Sedí na pařezu a hlídá, kdo tahá.', E(128, 160, 72, 50, c) + C(98, 112, 22, c) + C(158, 112, 22, c) + eyes(88, 110, 60, 11) + line('M100 168q28 18 56 0', 5) + cut('M80 190q10-8 20 0M156 190q10-8 20 0', a, 4) + P('M56 206h52M148 206h52', 'none', 'stroke-width="8"')],
    '9': ['Hříbek', 'Houbový skřítek s puntíkovaným kloboukem.', P('M54 120q0-70 74-70t74 70Z', c) + C(96, 86, 9, paper) + C(140, 72, 10, paper) + C(170, 100, 8, paper) + P('M98 120h60l6 92H92Z', paper) + eyes(110, 150, 30, 7) + line('M120 180q8 6 16 0', 3.5)],
    '10': ['Zlatá šiška', 'Šiška ze zlata: deset bodů pro šťastlivce.', P('M128 40q52 40 44 110-8 60-44 76-36-16-44-76-8-70 44-110Z', gold) + cut('M98 90q30 20 60 0M92 124q36 22 72 0M96 160q32 20 64 0M106 192q22 14 44 0', d, 4) + line('M128 40V20', 6) + P('M128 26q-24-14-34 4 18 6 34-4Z', c) + sparkle(190, 70, 10) + sparkle(64, 170, 9)],
    J: ['Hejkálek', 'Malý chlupatý hejkal se učí houkat.', P('M76 218q-10-70 10-110 12-38 42-40 30 2 42 40 20 40 10 110Z', d) + cut('M90 130l-8 10M104 118l-6 12M152 118l6 12M166 130l8 10', a, 3) + eyes(106, 120, 30, 9) + E(128, 160, 12, 16, ink) + P('M92 74l-20-30 28 12Zm72 0 20-30-28 12Z', c)],
    Q: ['Lesní žínka', 'Mechové vlasy a lucerna, co svede z cesty.', P('M84 220l10-82q34-22 68 0l10 82Z', c) + P('M78 132q-8-72 50-82 58 10 50 82-12-14-18-4-6-20-32-10-26-10-32 10-6-10-18 4Z', a) + C(128, 110, 26) + eyes(117, 106, 22, 5) + line('M120 126q8 6 16 0', 3) + C(96, 74, 6, glow) + C(160, 70, 6, glow) + lantern(196, 152, c)],
    K: ['Hejkal', 'Vládce hvozdu s větvemi místo parohů.', P('M58 222q-14-90 30-130 40-28 80 0 44 40 30 130Z', d) + line('M92 92 70 44 50 52M70 44l-6-24M164 92l22-48 20 8M186 44l6-24', 7) + cut('M84 150l-10 12M96 130l-8 14M172 150l10 12M160 130l8 14', a, 3.5) + eyes(104, 128, 48, 11) + E(128, 176, 18, 22, ink) + P('M118 178l4 10 6-10 6 10 4-10', 'none', `stroke="${paper}" stroke-width="3"`)],
    A: ['Starý pařez', 'Kořeny sevřou stůl: tah se zastaví.', P('M70 126h116l10 70H60Z', d) + E(128, 126, 58, 18, a) + cut('M128 126m-40 0a40 12 0 1 0 80 0a40 12 0 1 0-80 0M128 126m-20 0a20 6 0 1 0 40 0a20 6 0 1 0-40 0', d, 3) + P('M60 196l-24 30 40-12 10 20 18-34Zm136 0 24 30-40-12-10 20-18-34Z', d) + line('M106 168q8-8 16 0M134 168q8-8 16 0', 4) + P('M150 108q14-40 40-34-10 22-40 34Z', c)],
  }),
  spades: ({ c, a, d }) => ({
    '7': ['Štika', 'Hladová štika se zuby vyráží z hlubiny.', P('M30 140q60-56 150-28l48-26-14 52 14 50-48-26q-90 30-150-22Z', c) + P('M30 140l40 6-40 10Z', ink) + cut('M48 144l8 6 8-6 8 6 8-6', paper, 3) + C(92, 128, 9, glow) + C(93, 129, 4, ink) + cut('M120 120q30 10 60 0M120 160q30-10 60 0', a, 4)],
    '8': ['Žabák', 'Vodníkův poslíček na leknínu.', E(128, 210, 84, 14, a) + E(128, 160, 64, 46, c) + C(100, 116, 20, c) + C(156, 116, 20, c) + eyes(92, 114, 72, 10) + line('M98 168q30 20 60 0', 5) + P('M70 196q-20 4-26 18M186 196q20 4 26 18', 'none')],
    '9': ['Rak', 'Couvá, ale klepeta má vždycky připravená.', E(128, 150, 40, 54, c) + cut('M96 140h64M98 164h60M104 188h48', a, 4) + P('M92 110 54 70q-16 18 6 36Zm-38-40 28 4M164 110l38-40q16 18-6 36Zm38-40-28 4', c) + eyes(116, 104, 24, 6) + line('M104 196l-20 20M152 196l20 20M100 166l-26 6M156 166l26 6', 5)],
    '10': ['Perlorodka', 'Lastura s perlou: deset bodů na dně.', P('M40 160q88-110 176 0Z', c) + cut('M128 160 80 92M128 160l0-86M128 160l48-68M128 160 60 120M128 160l68-40', a, 3.5) + P('M40 160q88 60 176 0Z', d) + C(128, 166, 22, paper) + sparkle(150, 150, 8) + sparkle(204, 90, 10) + sparkle(52, 96, 8)],
    J: ['Vodníček', 'Malý vodník, kterému z šosu pořád kape.', P('M86 222l8-82q34-18 68 0l8 82-14-10-10 14-10-14-10 14-10-14-10 14-10-14Z', c) + C(128, 108, 30, a) + eyes(114, 104, 28, 7) + line('M118 128q10 8 20 0', 3.5) + P('M98 82h60l-6-36h-48Z', ink) + P('M90 80h76v8H90Z', ink) + P('M190 120q8 14 0 22-8-8 0-22Z', a)],
    Q: ['Rusalka', 'Dlouhé vlasy, tichá voda a lucerna, co mění směr.', P('M84 222l10-84q34-20 68 0l10 84Z', c) + P('M82 230q-14-120 46-138 60 18 46 138-14-40-14-100-32-20-32 20-14 100Z', d) + C(128, 112, 26) + eyes(117, 108, 22, 5) + line('M120 128q8 6 16 0', 3) + C(128, 72, 6, glow) + lantern(196, 152, c)],
    K: ['Vodník', 'Starý pán rybníka s dýmkou, cylindrem a mokrým šosem.', P('M70 224l14-96q44-22 88 0l14 96-16-14-12 16-14-16-14 16-14-16-14 16-12-16Z', c) + C(128, 100, 34, a) + P('M96 72h64l-6-48h-52Z', ink) + P('M86 70h84v10H86Z', ink) + P('M100 34h56v8h-56Z', d) + eyes(112, 96, 32, 7) + line('M112 122q16 10 32 0', 4) + P('M150 120l34-4v14h-10v-8l-24 4Z', d) + E(182, 106, 8, 6, paper) + cut('M110 150v56M146 150v56', a, 4)],
    A: ['Hrnek s dušičkou', 'Pod pokličkou dušička: zastaví celý stůl.', P('M78 96h100v104q0 18-18 18h-64q-18 0-18-18Z', a) + P('M178 120q36 0 36 30t-36 30', 'none', 'stroke-width="12"') + line('M178 120q36 0 36 30t-36 30', 5) + P('M70 86h116v14H70Z', d) + P('M110 86q18-26 36 0Z', d) + C(128, 64, 7, d) + E(128, 154, 20, 24, paper) + eyes(118, 150, 20, 5) + cut('M90 120v60', paper, 4)],
  }),
};

const ROLE = { '7': 'Útok', '8': 'Hlídka', '9': 'Tulák', '10': 'Poklad', J: 'Strašidýlko', Q: 'Bludná lucerna', K: 'Pán světa', A: 'Zastavení' };
const entries = [];
for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
  const set = cards[suit](S[suit]);
  for (const rank of ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']) {
    const [name, meaning, art] = set[rank];
    entries.push({ card: { id: `${suit}-${rank}`, suit, rank }, name, meaning, archetype: ROLE[rank], stickerAsset: `/decks/strasidla/stickers/${suit}-${rank.toLowerCase()}.svg`, art });
  }
}
for (const { art, ...entry } of entries) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><filter id="cut" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="6" result="edge"/><feOffset in="edge" dx="4" dy="6" result="offset"/><feFlood flood-color="#2B2350" flood-opacity=".45"/><feComposite in2="offset" operator="in" result="shadow"/><feFlood flood-color="#FFFDF7"/><feComposite in2="edge" operator="in" result="white"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#cut)">${art}</g></svg>`;
  writeFileSync(`packages/web/public${entry.stickerAsset}`, svg + '\n');
}
const manifest = entries.map(({ art, ...entry }) => entry);
mkdirSync('packages/web/src/themes/decks/strasidla', { recursive: true });
writeFileSync('packages/web/src/themes/decks/strasidla/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
writeFileSync('docs/visual/STRASIDLA_CARD_MAPPING.md', '# Strašidla — 32 původních bytostí\n\n'
  + 'Světy: Oheň (hearts), Noc (diamonds), Les (clubs), Voda (spades). Engine se nemění.\n'
  + 'Role: 7 útočí, 10 nese poklad (body), J je strašidýlko, Q nese bludnou lucernu (mění barvu), K je pán světa, eso je předmět, který zastaví hru.\n\n'
  + '| Identita | Role | Název a význam |\n|---|---|---|\n'
  + manifest.map(e => `| ${e.card.id} | ${e.archetype} | **${e.name}** — ${e.meaning} |`).join('\n') + '\n');

// Back: night sky, a ring of glowing eyes and the permanent BALÍK medallion.
const night = '#221B3A';
const ring = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; const x = 100 + 70 * Math.cos(a), y = 140 + 96 * Math.sin(a); return `<ellipse cx="${(x - 4).toFixed(1)}" cy="${y.toFixed(1)}" rx="3" ry="4"/><ellipse cx="${(x + 4).toFixed(1)}" cy="${y.toFixed(1)}" rx="3" ry="4"/>`; }).join('');
writeFileSync(`${dir}/back.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><rect width="200" height="280" rx="16" fill="#FFFDF7"/><rect x="8" y="8" width="184" height="264" rx="11" fill="${night}"/><path d="M150 40q-22 8-14 30 16 6 30-6-18 0-16-24Z" fill="${glow}"/><g fill="${glow}" opacity=".85">${ring}</g><path d="M18 18h164v244H18Z" fill="none" stroke="#6C4BC2" stroke-width="2"/><path d="m100 98 42 42-42 42-42-42Z" fill="#6C4BC2" stroke="${glow}" stroke-width="2"/><text x="100" y="147" text-anchor="middle" fill="#FFF8EC" font-family="sans-serif" font-size="19" font-weight="900">BALÍK</text></svg>\n`);
console.log(`Created ${entries.length} Strašidla stickers and a back.`);

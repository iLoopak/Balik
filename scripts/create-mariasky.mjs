// Original BALÍK "Mariášky" edition: a modern linocut take on German-suited Czech cards.
// No scans, fonts or traced historical decks. Palette = ink, paper, suit colour, ochre.
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = 'packages/web/public/decks/mariasky';
mkdirSync(`${dir}/stickers`, { recursive: true });

const ink = '#2A1F1A', paper = '#FBF3E1', ochre = '#E3A62B', blush = '#E58A72';
const SUIT = {
  hearts: { color: '#C8323A', name: 'Srdce' },
  diamonds: { color: '#F2B51F', name: 'Kule' },
  spades: { color: '#3D7F3F', name: 'Listy' },
  clubs: { color: '#6A4524', name: 'Žaludy' },
};

const P = (d, fill = paper, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const C = (x, y, r, fill = paper) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const line = (d, w) => `<path d="${d}" fill="none"${w ? ` stroke-width="${w}"` : ''}/>`;
/** Carved line: paper showing through the inked block. */
const carve = (d, w = 3.2) => `<path d="${d}" fill="none" stroke="${paper}" stroke-width="${w}"/>`;
const dot = (x, y, r = 3.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${paper}" stroke="none"/>`;

// ---- Suit pips in a 100×100 box; `detail` adds carved lines for large sizes. -----------------
const PIP = {
  hearts: (c, detail) => P('M50 90C22 70 8 52 8 33 8 18 19 9 31 9c9 0 15 5 19 12 4-7 10-12 19-12 12 0 23 9 23 24 0 19-14 37-42 57Z', c)
    + (detail ? carve('M50 34v34M50 50q-11-5-13-17M50 50q11-5 13-17', 4) : ''),
  // Kule = rolnička: a jingle bell with its loop, slot and sound hole, never a filled cap.
  diamonds: (c, detail) => `<circle cx="50" cy="11" r="7" fill="none"/>` + P('M50 18a37 37 0 1 1 0 74a37 37 0 1 1 0-74Z', c)
    + `<path d="M24 62h52M50 62v20" fill="none" stroke="${ink}" stroke-width="${detail ? 7 : 10}" stroke-linecap="round"/>`
    + C(24, 62, detail ? 5 : 7, ink) + C(76, 62, detail ? 5 : 7, ink)
    + (detail ? carve('M28 42q8-14 24-16', 4) : ''),
  spades: (c, detail) => P('M50 6C76 26 90 46 86 64 82 80 66 86 55 78v16H45V78C34 86 18 80 14 64 10 46 24 26 50 6Z', c)
    + (detail ? carve('M50 22v56M50 46l-16-10M50 46l16-10M50 62l-18-8M50 62l18-8', 3.5) : carve('M50 24v52', 5)),
  // Žalud: dark hatched cup, long nut with a point — reads apart from the round kule.
  clubs: (c, detail) => P('M47 0h6v12h-6Z', ink) + P('M16 44c0-20 15-32 34-32s34 12 34 32Z', '#3A2410')
    + P('M24 48h52c0 24-9 40-26 50-17-10-26-26-26-50Z', c)
    + (detail ? carve('M26 38l10-14M40 36l8-14M56 36l-2-14M70 38l-8-12M30 28l38 0', 3.2) + carve('M38 60q4 16 12 24', 4) : carve('M22 32h56', 5) + carve('M40 60q4 14 10 20', 6)),
};
/** Pip at a centre point with a given pixel size; stroke stays 5px after scaling. */
const pip = (suit, x, y, size, detail = size >= 60) => {
  const s = size / 100;
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${s})" stroke-width="${(5 / s).toFixed(2)}">${PIP[suit](SUIT[suit].color, detail)}</g>`;
};

// ---- Number cards: pip compositions that show the card's role. ----------------------------
const sprig = (x, y) => line(`M${x} ${y + 22}V${y - 6}`) + P(`M${x} ${y - 24}c9 6 9 16 0 20-9-4-9-14 0-20Z`, ochre) + P(`M${x} ${y + 8}c-13 0-18-8-18-14 9 0 16 4 18 14Zm0 0c13 0 18-8 18-14-9 0-16 4-18 14Z`, paper);
const layouts = {
  // VII: an arrow pointing up — the attacking card (+2 in Prší, takes the trick in Sedma).
  '7': s => [[128, 42], [90, 92], [166, 92], [52, 142], [204, 142], [128, 142], [128, 204]].map(([x, y]) => pip(s, x, y, 44)).join('') + line('M128 168v14'),
  '8': s => sprig(128, 126) + [46, 100, 154, 208].flatMap(y => [pip(s, 74, y, 42), pip(s, 182, y, 42)]).join(''),
  '9': s => [64, 128, 192].flatMap(y => [64, 128, 192].map(x => pip(s, x, y, 46))).join(''),
  // X: a wreath around a medal — ten points in Sedma.
  '10': s => C(128, 128, 30, ochre) + carve('M128 108v40M108 128h40', 4) + C(128, 128, 9, paper)
    + Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; return pip(s, Math.round(128 + 88 * Math.cos(a)), Math.round(128 + 88 * Math.sin(a)), 40); }).join(''),
};

// ---- Figures: one carved bust template, varied by headwear, face and attribute. -------------
const face = ({ mustache, beard, female }) =>
  C(128, 82, 28) + `<ellipse cx="117" cy="80" rx="3" ry="4" fill="${ink}" stroke="none"/><ellipse cx="139" cy="80" rx="3" ry="4" fill="${ink}" stroke="none"/>`
  + line('M128 84l-3 9h5', 3) + C(111, 93, 4.5, blush).replace('/>', ' stroke="none"/>') + C(145, 93, 4.5, blush).replace('/>', ' stroke="none"/>')
  + (beard ? P('M101 86q2 44 27 48 25-4 27-48-8 14-27 14-19 0-27-14Z', ink) + carve('M118 112q10 6 20 0M114 122q14 8 28 0', 2.4) : '')
  + (mustache ? P('M111 99q8-9 17-3 9-6 17 3-8 4-17 0-9 4-17 0Z', ink) : beard ? '' : line('M120 100q8 5 16 0', 3))
  + (female ? P('M100 76q-6 30 4 52l8-4q-10-20-4-44Z', ink) + P('M156 76q6 30-4 52l-8-4q10-20 4-44Z', ink) : '');
const torso = (color, { female, cloak }) =>
  P('M78 240 82 140q4-26 46-28 42 2 46 28l4 100Z', cloak ?? color)
  + (cloak ? P('M104 240l2-110 22 26 22-26 2 110Z', color) + carve('M128 158v80', 3) : carve('M106 118l22 40 22-40', 3.4))
  + (female ? C(84, 132, 14) + C(172, 132, 14) + dot(116, 186) + dot(128, 196) + dot(140, 186) + dot(128, 176) : dot(128, 176) + dot(128, 198) + dot(128, 220))
  + carve('M90 160l9 6M90 182l9 6M90 204l9 6M166 160l-9 6M166 182l-9 6M166 204l-9 6', 2.6);
const HATS = {
  klobouk: c => P('M84 62q44-10 88 0 6 4 0 8-44-6-88 0-6-4 0-8Z', ink) + P('M104 62q0-28 24-28 24 0 24 28Z', c) + P('M104 54h48v7h-48Z', ochre) + P('M150 48q20-24 30-6-14 0-28 12Z', paper),
  cepice: c => P('M98 66q-2-30 30-30 30 0 34 20l16 8q-2 6-12 4H98Z', c) + carve('M108 46q20-8 40 2', 3) + C(128, 37, 5, ochre),
  kulich: c => P('M100 68q0-38 28-38 28 0 28 38Z', c) + carve('M104 56h48M106 46h44', 3) + C(128, 28, 8, paper),
  satek: c => P('M96 78q-2-46 32-46 34 0 32 46l-8-2q0-30-24-30-24 0-24 30Z', c) + dot(112, 46) + dot(128, 40) + dot(144, 46) + P('M150 104l20 18-6 8-20-14Z', c),
  myslivna: c => P('M86 64q42-8 84 0 4 4 0 7-42-5-84 0-4-3 0-7Z', ink) + P('M106 64q4-26 22-28 20 2 22 28Z', c) + line('M150 52q16-30 30-34', 4) + P('M152 52q10-30 26-36-4 22-26 36Z', ochre),
  koruna: () => P('M98 64l-6-34 18 14 10-22 8 18 8-18 10 22 18-14-6 34Z', ochre) + C(128, 50, 5, paper) + C(110, 56, 3.5, paper) + C(146, 56, 3.5, paper),
};
const hand = (x, y) => C(x, y, 11);
const ATTR = {
  // Spodci: craft tools.
  dudy: c => P('M40 150q-8-34 26-40 30 2 26 38-6 26-30 24-18-2-22-22Z', c) + carve('M52 136q14-10 30 0', 3) + line('M64 112 50 70M76 112l6-46M86 118l30-30', 5) + P('M44 64h12v10H44Zm32-2h12v10H76Z', ochre),
  podnos: c => P('M150 168h84l-8 14h-68Z', ochre) + [[164, 156], [190, 150], [216, 156]].map(([x, y]) => pip('diamonds', x, y, 26, false)).join(''),
  konev: c => P('M160 160h52l-4 56h-44Z', c) + P('M212 172l28-24 4 6-26 28Z', c) + P('M234 140h10v20h-10Z', ochre) + line('M170 160q16-26 32 0', 5) + carve('M168 184h36', 3),
  pytel: () => P('M156 134q14-14 30-6l26 0q14-8 20 6l-4 98h-76Z', paper) + line('M172 140q20 8 40 0', 4) + pip('clubs', 194, 186, 34, false),
  // Svršci: the banner that changes the suit.
  prapor: s => line('M192 238V30', 6) + C(192, 26, 6, ochre) + P('M196 36h44l-12 24 12 24h-44Z', paper) + pip(s, 214, 60, 30, false),
  // Králové: sceptre crowned with the suit.
  zezlo: s => line('M58 238V70', 7) + P('M52 70h12v10H52Z', ochre) + pip(s, 58, 50, 40, false),
};
const badge = (s, x, y) => pip(s, x, y, 28, false);
// Sleeve from the shoulder to the hand that holds the attribute.
const ARM = { dudy: [90, 134, 98, 150], podnos: [166, 134, 154, 184], konev: [168, 134, 162, 194], pytel: [168, 134, 160, 174], prapor: [170, 132, 192, 160], zezlo: [86, 132, 58, 158] };
const arm = ([x1, y1, x2, y2], color) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width="24"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="14"/>` + hand(x2, y2);
function figure(suit, { hat, attr, mustache, beard, female, cloak, low }) {
  const c = SUIT[suit].color;
  const attrArt = attr === 'prapor' || attr === 'zezlo' ? ATTR[attr](suit) : ATTR[attr](c);
  // Spodek wears the suit low (belt), svršek high (banner): a nod to the classic pip positions.
  return torso(c, { female, cloak }) + attrArt + arm(ARM[attr], cloak ?? c) + face({ mustache, beard, female }) + HATS[hat](c) + (low ? badge(suit, 128, 228) : '');
}

// ---- Aces: big suit emblem on a round seal — the card that stops play. Seasons per suit. -----
const seal = c => C(128, 128, 104) + `<circle cx="128" cy="128" r="92" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="6 7"/>`;
const ACE = {
  spades: c => seal(c) + pip('spades', 128, 126, 132) + P('M156 66q8-14 22-10l10-4-6 10q-2 12-16 12Z', ochre) + C(170, 60, 2.2, ink)
    + [[60, 84], [196, 168], [70, 180]].map(([x, y]) => P(`M${x} ${y - 9}l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z`, paper)).join(''),
  hearts: c => seal(c) + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return line(`M${(128 + 70 * Math.cos(a)).toFixed(1)} ${(128 + 70 * Math.sin(a)).toFixed(1)}L${(128 + 88 * Math.cos(a)).toFixed(1)} ${(128 + 88 * Math.sin(a)).toFixed(1)}`, 5); }).join('') + pip('hearts', 128, 130, 124),
  diamonds: c => seal(c) + line('M128 24v18', 5) + P('M108 40q20-16 40 0', 'none') + pip('diamonds', 128, 132, 120)
    + [[58, 96, 30], [196, 182, -20], [196, 82, 60]].map(([x, y, r]) => `<path transform="rotate(${r} ${x} ${y})" d="M${x} ${y - 14}q12 10 0 28-12-18 0-28Z" fill="${ochre}"/>`).join(''),
  clubs: c => seal(c) + P('M68 92q-10-30 18-34 6 18-18 34Z', SUIT.spades.color) + P('M188 92q10-30-18-34-6 18 18 34Z', SUIT.spades.color) + pip('clubs', 128, 136, 118)
    + [[66, 168], [190, 172], [128, 44]].map(([x, y]) => line(`M${x - 10} ${y}h20M${x} ${y - 10}v20M${x - 7} ${y - 7}l14 14M${x + 7} ${y - 7}l-14 14`, 3)).join(''),
};

// ---- The 32 cards ------------------------------------------------------------------------------
const ROLE = { '7': 'Útočná sedma', '8': 'Klidná řada', '9': 'Mřížka', '10': 'Věnec', J: 'Spodek', Q: 'Svršek', K: 'Král', A: 'Eso' };
const COURTS = {
  hearts: {
    J: ['Dudák', 'Mladý muzikant rozehrává svatbu na dudy.', { hat: 'klobouk', attr: 'dudy', low: true }],
    Q: ['Družička', 'Vede průvod a praporem obrací celou hru.', { hat: 'satek', attr: 'prapor', female: true }],
    K: ['Král muzikantů', 'Starý primáš s korunou a srdcovým žezlem.', { hat: 'koruna', attr: 'zezlo', beard: true, cloak: '#7A1E25' }],
    A: ['Srdcové eso · léto', 'Srdce v plném slunci. Zastaví každý tah.'],
  },
  diamonds: {
    J: ['Kramářka', 'Na jarmarku nabízí tác cinkajících rolniček.', { hat: 'satek', attr: 'podnos', female: true, low: true }],
    Q: ['Zvoník', 'Svolává náves a jeho prapor mění barvu.', { hat: 'cepice', attr: 'prapor', mustache: true }],
    K: ['Král jarmarku', 'Kupec všech kupců s rolničkou na žezle.', { hat: 'koruna', attr: 'zezlo', mustache: true, cloak: '#A8700A' }],
    A: ['Kulové eso · podzim', 'Rolnička mezi padajícím listím.'],
  },
  spades: {
    J: ['Zahradník', 'Zalévá záhony, dokud ostatní hrají.', { hat: 'kulich', attr: 'konev', low: true }],
    Q: ['Myslivkyně', 'S pérem za kloboukem vede hon jinou barvou.', { hat: 'myslivna', attr: 'prapor', female: true }],
    K: ['Lesní král', 'Vousatý vládce háje se zeleným žezlem.', { hat: 'koruna', attr: 'zezlo', beard: true, cloak: '#244D27' }],
    A: ['Listové eso · jaro', 'Pupen, ptáček a první květy.'],
  },
  clubs: {
    J: ['Mlynářský učeň', 'Nosí pytle mouky pečetěné žaludem.', { hat: 'cepice', attr: 'pytel', low: true }],
    Q: ['Vozka', 'Zastaví povoz a praporem stočí cestu.', { hat: 'klobouk', attr: 'prapor', mustache: true }],
    K: ['Král dubiny', 'Mlynář v hermelínu se žaludovým žezlem.', { hat: 'koruna', attr: 'zezlo', beard: true, cloak: '#3E2713' }],
    A: ['Žaludové eso · zima', 'Žalud v dubových listech pod sněhem.'],
  },
};
const NUMBER_NAMES = { '7': 'Šipka', '8': 'Dvě řady', '9': 'Mřížka', '10': 'Věnec' };
const NUMBER_MEANING = {
  '7': 'Sedm symbolů míří vzhůru: útok v Prší, vítěz štychu v Sedmě.',
  '8': 'Dvě klidné řady kolem okrového tulipánu.',
  '9': 'Pravidelná mřížka devíti symbolů.',
  '10': 'Deset symbolů ve věnci kolem medaile: body v Sedmě.',
};

const entries = [];
for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
  for (const rank of ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']) {
    const court = COURTS[suit][rank];
    const name = court ? court[0] : `${NUMBER_NAMES[rank]} · ${SUIT[suit].name}`;
    const meaning = court ? court[1] : NUMBER_MEANING[rank];
    const art = rank === 'A' ? ACE[suit](SUIT[suit].color) : court ? figure(suit, court[2]) : layouts[rank](suit);
    entries.push({ card: { id: `${suit}-${rank}`, suit, rank }, name, meaning, archetype: ROLE[rank], stickerAsset: `/decks/mariasky/stickers/${suit}-${rank.toLowerCase()}.svg`, art });
  }
}

for (const { art, ...entry } of entries) {
  // Die-cut paper edge with a warm offset print shadow, like the other editions.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><filter id="cut" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="6" result="edge"/><feOffset in="edge" dx="4" dy="5" result="offset"/><feFlood flood-color="#9C3A2A" flood-opacity=".55"/><feComposite in2="offset" operator="in" result="shadow"/><feFlood flood-color="#FFFBF0"/><feComposite in2="edge" operator="in" result="white"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#cut)">${art}</g></svg>`;
  writeFileSync(`packages/web/public${entry.stickerAsset}`, svg + '\n');
}
const manifest = entries.map(({ art, ...entry }) => entry);
mkdirSync('packages/web/src/themes/decks/mariasky', { recursive: true });
writeFileSync('packages/web/src/themes/decks/mariasky/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
writeFileSync('docs/visual/MARIASKY_CARD_MAPPING.md', '# Mariášky — 32 původních linorytů\n\n'
  + 'Barvy: srdce (hearts), kule (diamonds), listy (spades), žaludy (clubs). Engine se nemění, mapování je jen zobrazení.\n'
  + 'Indexy: VII, VIII, IX, X, Sp (spodek = J), Sv (svršek = Q), K, E (eso). Svršek mění barvu v Prší stejně jako Q.\n'
  + 'Role: VII míří vzhůru (útok), X je věnec (body), svršek nese prapor (změna barvy), eso leží na pečeti (stop).\n\n'
  + '| Identita | Role | Název a význam |\n|---|---|---|\n'
  + manifest.map(e => `| ${e.card.id} | ${e.archetype} | **${e.name}** — ${e.meaning} |`).join('\n') + '\n');

// Back: cream paper, red linocut frame, folk lattice and the permanent BALÍK medallion.
const red = '#B8282F';
const lattice = [];
for (let y = 34; y <= 250; y += 27) for (let x = 30 + ((y / 27) % 2 ? 0 : 14); x <= 172; x += 28) {
  if (Math.abs(x - 100) < 52 && Math.abs(y - 140) < 52) continue;
  lattice.push(`M${x} ${y - 7}c4 4 4 9 0 12-4-3-4-8 0-12Z`);
}
writeFileSync(`${dir}/back.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><rect width="200" height="280" rx="16" fill="#FFFDF7"/><rect x="8" y="8" width="184" height="264" rx="11" fill="${paper}"/><rect x="14" y="14" width="172" height="252" rx="8" fill="none" stroke="${red}" stroke-width="4"/><rect x="20" y="20" width="160" height="240" rx="5" fill="none" stroke="${red}" stroke-width="1.5"/><path d="${lattice.join('')}" fill="${red}"/><path d="m100 82 58 58-58 58-58-58Z" fill="${red}"/><path d="m100 94 46 46-46 46-46-46Z" fill="none" stroke="${paper}" stroke-width="2"/><text x="100" y="147" text-anchor="middle" fill="${paper}" font-family="sans-serif" font-size="20" font-weight="900">BALÍK</text><path d="M86 160h28" stroke="${ochre}" stroke-width="3" stroke-linecap="round"/></svg>\n`);
console.log(`Created ${entries.length} Mariášky linocuts and a back.`);

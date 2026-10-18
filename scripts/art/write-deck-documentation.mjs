import {writeFileSync} from 'node:fs';
export function writeDeckDocumentation(d,manifest,premium){
 const status=premium?'32 prémiových rastrových ilustrací':'32 pracovních SVG motivů';
 const state=premium?'Kompletní rastrová edice v uživatelem schváleném výtvarném směru. Každý asset má vlastní obrazové generování a kompozici.':'SVG studie, nikoli schválený prémiový artwork. BIO je zatím ve fázi porovnání rastrové v1 a zjednodušené v2 na `/dev/art-poc`.';
 const assets=premium?`32 transparentních WebP s max. hranou 768 px, 32px bezpečnostní okraj: \`packages/web/public/decks/${d.id}/stickers/{suit}-{rank}.webp\`.`:`32 transparentních SVG 256 × 256: \`packages/web/public/decks/${d.id}/stickers/{suit}-{rank}.svg\`.`;
 const links=premium?`[Přehled 32 skutečných ilustrací](premium-series/${d.id}-contact.png) · [48px miniatury](premium-series/${d.id}-small.png)`:`[Přehled SVG studií](${d.id}-contact.png) · [48px SVG studie](${d.id}-small.png)`;
 const source=premium?'Obrázky: built-in image_gen, jeden prompt na kartu. Přesné prompty a původní lokální PNG: `docs/visual/premium-series/generated/`. Kompoziční zadání: `scripts/art/premium-directions.mjs`. Export používá pouze alpha crop, padding, resampling a WebP encoding; nic nedokresluje.':'Zdroj studií: `scripts/art/'+d.id+'.mjs`. Samostatný rastrový BIO koncept není přepnutím celé edice na finální art.';
 const doc=`# ${d.name} — ${status}

**Výtvarný stav:** ${state}

${d.direction}

${d.principle}

## Čtyři světy

| Herní suit | Svět | Akcent / inkoust | Charakter |
|---|---|---|---|
${Object.entries(d.suits).map(([s,v])=>`| ${s} | ${v.name} | ${v.color} / ${v.ink} | ${v.character} |`).join('\n')}

Každý svět má samostatný suit symbol. Původní herní suits a pravidla se nemění.
Temné inkousty slouží indexům, světlejší akcenty velkým plochám ilustrací a dekoraci.

## Mapping

7 = Glitch (drobná nehoda), 8 = Obrana, 9 = Maskot, 10 = Dominanta, J = Kurýr,
Q = Kapitán, K = Boss, A = Esence. J/Q/K jsou individuální postavy nebo entity,
nikoli nové herní role. Esa jsou velké ikonické totemy.

| Identita | Archetyp | Motiv |
|---|---|---|
${manifest.map(e=>`| ${e.card.id} | ${e.archetype} | **${e.name}** — ${e.meaning} |`).join('\n')}

## Assety a integrace

- ${assets} Bez textu, hodnot, indexů a bez líce karty.
- Rub: \`packages/web/public/decks/art-backs/${d.id}.webp\`, 640 × 896 se značkou BALÍK; aktivní v galerii, showroomu i během hry.
- Manifest: \`packages/web/src/themes/decks/${d.id}/manifest.json\`.
${premium?`- Autoritativní manifest rastrové edice: \`packages/web/src/themes/decks/${d.id}/premium-manifest.json\`. Opětovné \`art:worlds\` jej zachová.\n`:''}- Veřejná galerie: \`/decks/${d.id}\` — skutečný CardView, filtr, detail, malé karty, světlý/tmavý podklad, ruby.
- Stůl **${d.tableName}** je nezávisle volitelná decentní paleta stávajícího BALÍK aparátu.
- Preference zůstává lokální v \`balik.appearance\`. Žádné nové herní ani síťové údaje.

${source}

## Čitelnost a principy

${links}

CardBase, indexy, sticker a FX zůstávají oddělené. Velké siluety a hodnotové skupiny
mají přednost před mikrotexturou. Materiál, konstrukce, gesto a kompozice nesou
výtvarnou kvalitu; validita souboru ani počet motivů ji samy neprokazují.

${premium?'Původní SVG zůstávají pouze jako archiv pracovních studií. Runtime používá všech 32 WebP, nikoli směs SVG a rasteru.':'Původní SVG nenahrazují chybějící finální ilustrace.'}

Dekorativní efekty zachovávají stávající časování a reduced motion. Samostatný
papírový flutter není implementován. Tisková sazba a barevný profil nejsou součástí webových assetů.

Historie resetu a kvalitativní kritéria: [PREMIUM_ART_AUDIT.md](PREMIUM_ART_AUDIT.md).
`;
 writeFileSync(`docs/visual/${d.id.toUpperCase().replaceAll('-','_')}_CARD_MAPPING.md`,doc);
}

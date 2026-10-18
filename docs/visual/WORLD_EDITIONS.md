# BIO//PUNK · PANELÁK 3000 · CHALUPA! · PAPÍROVÝ CIRKUS

Všechny čtyři edice mají po 32 samostatných prémiových rastrových stickerech:
128 WebP. Každý svět má vlastní materiály, anatomii, barvu a symbol. BIO//PUNK
navazuje na zjednodušenou v2, ostatní edice na tři původní schválené koncepty.
Původní SVG zůstávají archivem studií; žádná hotová sada je nepoužívá jako náhradu.

| Edice / galerie | Médium a čtyři světy | Mapping |
|---|---|---|
| BIO//PUNK · `/decks/biopunk` | Biomech komiks podle v2; Trnové sady, Mykosíť, Chitin, Genové lázně | [32 ilustrací](BIOPUNK_CARD_MAPPING.md) |
| PANELÁK 3000 · `/decks/panelak-3000` | Retrofuturistické vinylové/toy skulptury; Byty, Balkony, Podzemí, Střechy | [32 ilustrací](PANELAK_3000_CARD_MAPPING.md) |
| CHALUPA! · `/decks/chalupa` | Expresivní letní komiks; Zahrada, Les, Voda, Výpravy | [32 ilustrací](CHALUPA_CARD_MAPPING.md) |
| PAPÍROVÝ CIRKUS · `/decks/papirovy-cirkus` | Fyzické vrstvené papírové divadlo; Masky, Loutky, Šelmy, Iluze | [32 ilustrací](PAPIROVY_CIRKUS_CARD_MAPPING.md) |

## Výtvarné principy

Postavy mají individuální anatomii, výraz a gesto. Objekty nesou konstrukci,
materiály a konkrétní situaci. Silueta a velké světelné plochy mají přednost před
mikrotexturou; drobné rekvizity jsou odměnou při zvětšení, ne podmínkou rozpoznání.

BIO používá velké anatomické plochy, tři světelné skupiny a selektivní odlesky. Trnové sady jsou kyselinově zelené, Mykosíť fialová, Chitin korálový a Genové lázně tyrkysové. PANELÁK rozlišuje smalt, mosaz, beton, gumu a textil. Byty mají teplý meruňkový
akcent, Balkony zelený, Podzemí fialový, Střechy modrý. CHALUPA používá výrazný
komiksový outline a teplé světlo; Zahrada je korálová, Les mechový, Voda tyrkysová,
Výpravy slunečně žluté. CIRKUS ukazuje tloušťku řezu, papírová vlákna, překryvy
a kontaktní stíny; Masky jsou korálové, Loutky zlaté, Šelmy modré, Iluze švestkové.

Archetypy navazují na existující systém: 7 Glitch, 8 Obrana, 9 Maskot,
10 Dominanta, J Kurýr, Q Kapitán, K Boss, A Esence. Jsou to motivické role,
nikoli nová pravidla. Esa fungují jako dominantní totemy daného světa.

## Assety a reprodukovatelnost

- Hotové stickery: `packages/web/public/decks/{id}/stickers/{suit}-{rank}.webp`.
  Transparentní, bez textu a indexů, maximálně 768 px, 32px alpha padding.
- Aktivní imagegen ruby: `/decks/art-backs/{id}.webp`, 640 × 896. Stejný rub
  používá celá edice ve hrách, showroomu i galeriích; staré `back.svg` jsou archiv.
- Každý svět má samostatný suit symbol a akcent; indexy používají tmavší inkoust.
  Výřezy symbolů mají explicitní `fillRule: 'evenodd'`.
- Individuální kompozice: `scripts/art/premium-directions.mjs`.
- Prompty, reference, zdrojové cesty a exportní údaje:
  `docs/visual/premium-series/generated/`.
- Autoritativní rastrové mappingy: `themes/decks/{id}/premium-manifest.json`.
  `npm run art:worlds` je zachová a obnoví runtime manifesty, registry a dokumentaci.
- Původní SVG zůstávají archivem studií pro srovnání. Není jimi doplněná
  žádná chybějící položka hotové rastrové edice.

[Pipeline a export](premium-series/README.md) ·
[Historický kritický audit a POC](PREMIUM_ART_AUDIT.md).

## Integrace a izolace

CardBase, CardIndices, CardStickerLayer a CardEffectLayer zůstávají oddělené.
Indexy zůstávají čitelné v rozích i při překryvu ruky. Artwork není herní identita.

Registry zásobuje appearance picker, homepage, galerie i Dev Deck Lab se všemi
devíti hrami. Galerie obsahují skutečný CardView, filtr světa, detail a význam,
odkaz na sticker, malou velikost, světlý/tmavý podklad a rub.
`/dev/art-poc` zachovává srovnání původních SVG s POC a BIO v1/v2.

Stoly Živý obvod, Noční sídliště, Letní večer a Za oponou používají stávající
geometrie BALÍK konzole a decentní materiály. Jsou nezávislé na decku.
Preference zůstává lokální v `balik.appearance`; výchozí vzhled se nemění.

Pravidla, engine, transporty, room state ani skryté informace se nemění.
Preload vybírá celou edici, nikoli podmnožinu podle soukromé ruky.
Zakrytá karta nevykresluje sticker ani indexy; POC override tuto hranici respektuje.

## Ověření a limity

Technický audit: `SHARP_MODULE=/cesta/k/sharp npm run qa:premium-assets`.
Kontroluje 128 existujících WebP, skutečnou alpha, bezpečné okraje, rozměry
a unikátní obsah a vytváří přehledy v 174/48 px. Nejde o výtvarné hodnocení.
Záznam výtvarné kontroly: `premium-series/visual-review.json`.

`qa:world-assets` kontroluje všech 128 aktivních stickerů, ve čtyřech rastrových edicích.
Testy ověřují všech 32 identit ve všech devíti hrách, lokální preference, registry,
cesty, oddělené vrstvy, identické ruby skrytých identit a deterministické partie
se střídáním vzhledu. Závěrečné výsledky jsou v `premium-series/verification.md`.

Při 48–64 px záměrně ustupují papírová vlákna, drobné šrouby a rekvizity; nositelem
identity je obrys, hlavní materiál, barva a gesto. Detail není podmínkou čtení hodnoty.
Papírový flutter není přidaný; stávající FX a reduced motion zůstávají stejné.
Tisková sazba a CMYK profily nejsou součástí webových assetů. Fyzický telefon
a nový živý multiplayer walkthrough zůstávají doporučenou kontrolou před vydáním.

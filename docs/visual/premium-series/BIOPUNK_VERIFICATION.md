# BIO//PUNK — dokončení poslední prémiové edice

Po následném požadavku uživatele bylo doplněno 31 nových ilustrací. Vybraný
Fotosyntetický kolos v2 je zachován jako hearts-K. Runtime nyní používá všech
32 transparentních WebP a edice už není označena jako SVG studie.

## Výtvarné hodnocení

Prohlédnuty všechny motivy v 174px i 48px přehledu a vybrané originály v plném
rozlišení. Siluety rozlišují listový štít, serverový skleník, štíhlého kurýra,
serpentinovou královnu, houbové organismy, hmyz i laboratorní membrány.
Postavy nesdílejí jednotnou humanoidní anatomii. Tři hodnotové skupiny, velké
materiálové plochy a soustředěné světlo navazují na zjednodušenou v2.

Mykosíť má fialové klobouky a hyfy, Chitin korálové pancíře a jantarové klouby,
Genové lázně tyrkysové průsvitné membrány. Veškeré hodnoty a suit symboly zůstávají
mimo sticker. Drobné žilkování, konektory a spoje při miniaturizaci ustupují;
hlavní gesto a silueta nesou identitu. Technický audit není výtvarné schválení.

Roháčový titán měl drobný dotyk obrysu se zdrojovou hranou. Opravná imagegen
iterace zachovala postavu a doplnila bezpečné rámování všech kusadel a končetin.
Původní zdroj i opravný prompt zůstaly v jeho job JSON.

## Export a ověření

- 32 BIO WebP: 6 526 680 B, skutečná alpha, max. 768 px, 32px padding.
- Všechny aktuální zdroje mají viditelný motiv uvnitř zdrojového PNG.
- Čtyři celé prémiové edice nyní obsahují 128 WebP, celkem 24 260 830 B.
- `npm test`: 249 testů / 28 souborů, vše úspěšně.
- `npm run typecheck`, `npm run build`, `qa:premium-assets`, `qa:world-assets`
  a `git diff --check`: úspěšně.
- Původní herní identity, síťová logika, pravidla a hranice skrytých karet jsou
  zachované. Regresní testy používají všechny edice ve všech devíti hrách.
- Skutečná browser galerie ověřena v normální velikosti na tmavém stole,
  s malými kartami na světlém stole, se společnými ruby a filtrem Chitin.
  Screenshoty: `output/playwright/premium-series/biopunk-gallery.png`,
  `biopunk-small-light.png`, `biopunk-backs.png`.

Veřejná galerie: `/decks/biopunk`. Mapping a principy:
[BIOPUNK_CARD_MAPPING.md](../BIOPUNK_CARD_MAPPING.md).
Přesné prompty, reference a zdrojové cesty: `generated/biopunk--*.json`.
Kompoziční zadání: `scripts/art/biopunk-premium-directions.mjs`.

Samostatné webové assety nejsou tisková sazba. Kontrola na fyzickém telefonu
a nový živý multiplayer walkthrough zůstávají doporučenou kontrolou před vydáním.

# Ověření dokončených rastrových edic — 18. 10. 2026

**Historický záznam první dávky tří edic.** BIO//PUNK bylo následně dokončené;
aktuálně je hotových všech 128 rastrových ilustrací. Jeho závěrečné ověření je v
[BIOPUNK_VERIFICATION.md](BIOPUNK_VERIFICATION.md).

PANELÁK 3000, CHALUPA! a PAPÍROVÝ CIRKUS: **32 + 32 + 32 WebP**.
93 nových kompozic, tři převzaté schválené POC. BIO má pouze návrh v2;
dalších 31 BIO ilustrací není hotových a jeho runtime zůstává označenou SVG studií.

## Výsledky

- `npm run typecheck`: úspěšně.
- `npm test`: **249 testů / 28 souborů**, vše prošlo.
- `npm run build`: web i server úspěšně. Dev art POC se do produkčního JS nebalí.
- `qa:premium-assets`: 96 transparentních WebP, unikátní obsah, max. 768 px,
  bezpečné alpha okraje; žádný aktuální zdrojový motiv nedosahuje na hranu PNG.
- `qa:world-assets`: všech 128 aktivních stickerů včetně BIO studií lze dekódovat
  a mají bezpečné okraje; čtyři ruby lze rasterizovat.
- `git diff --check`: úspěšně.
- Opakované `art:worlds` zachovalo všechny tři runtime manifesty i registry byte
  po bytu; finální rastrové mappingy se nevracejí k SVG studiím.

Celková velikost 96 WebP: 17 734 150 B. Technické kontroly nejsou hodnocením
výtvarné kvality. [Samostatné výtvarné hodnocení](visual-review.json) vychází
z prohlédnutí všech tří 174px a 48px contact sheetů i skutečných karet v aplikaci.

## Živá kontrola v prohlížeči aplikace

- Všechny tři veřejné galerie načítají kompletní rastrový mapping a vlastní motivy.
- Běžné i malé karty, světlý/tmavý stůl a čitelné rohové indexy.
- PANELÁK: filtr Balkony, osm výsledků, detail J a odkaz na skutečný samostatný WebP.
- CIRKUS: přepnutí na společné ruby; zakryté karty nevykreslují sticker ani indexy.
- Picker: tři hotové sady bez značky studie, BIO se značkou studie.
- Volba PAPÍROVÉHO CIRKUSU zůstala po reloadu uložená; nezávislý stůl Letní večer
  se nezměnil. Po zkoušce byla obnovena původní volba PANELÁKU.
- `/dev/art-poc`: zachované původní SVG srovnání, nové BIO v1/v2, 64px stickery
  a 76px karta; pravdivý počet dokončených sad a chybějících BIO ilustrací.

Screenshoty: `output/playwright/premium-series/`.

## Opravy a praktické limity

Balkonový kurýr původně měl kabel uříznutý hranou zdroje. Obrazová revize
zachovala postavu a materiály a ukončila oba konce kabelu uvnitř motivu.
Historie zdroje i přesný opravný prompt zůstaly v jeho job JSON.

Název vodní Q v CHALUPĚ je Pán plovárny podle skutečné postavy. Archetyp Kapitán
a herní identita clubs-Q se nemění.

Při miniaturizaci ustupují vlákna, šrouby, mapové značky a drobné rekvizity.
Hlavní silueta, gesto a hodnotové plochy zůstávají nositelem motivu. Tisková sazba,
CMYK a nové pohybové efekty nejsou součástí tohoto resetu. Kontrola na fyzickém
telefonu a nový živý multiplayer walkthrough zde neproběhly; herní izolaci chrání
deterministické regresní testy všech devíti her.

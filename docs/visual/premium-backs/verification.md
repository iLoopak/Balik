# Ověření návrhů rubů · 2026-10-18

**Aktuální stav:** všech pět rubů je následnou opravou aktivováno v runtime registry.
Kontroly vydání: [RUNTIME_RELEASE.md](RUNTIME_RELEASE.md). Níže zůstává historie návrhů před aktivací.

Všech pět skutečných imagegen výstupů zkontrolováno vizuálně. Nápis BALÍK má čárku nad Í; bez hodnot, indexů, dodatečných textů či vnějšího fotografického mockupu. U Stormpunku použity skutečné původní sticker assety Výhně a Bouře jako stylové reference.

Export všech pěti návrhů: neprůhledný WebP 640 × 896, poměr 5:7. Metadata a velikosti jsou v jednotlivých job JSON; celkem 1 283 788 B. Není to přesná rotační symetrie ani tisková sazba.

Galerie `/dev/art-backs` ověřena ve skutečném prohlížeči: všech pět sekcí, stávající líce/ruby přes CardView, nové ruby, 76px miniatury, tmavý i světlý podklad a odkazy na WebP. Screenshoty v `output/playwright/premium-backs/`: `bio-panelak.png`, `chalupa-cirkus.png`, `stormpunk.png`, `light.png`.

`npm run typecheck`, `npm run build`, `npm test` (249 testů / 28 souborů) a `git diff --check` prošly. Dev galerie ani její texty nejsou součástí produkčního JS bundlu. Veřejné obrazové soubory jsou při sestavení zkopírovány jako statické assety. Runtime registry stále odkazuje na původní ruby; návrhy nemění vzhled skrytých karet během hry.

## Původní omezení pracovního checkoutu

Upozornění na změny main ověřeno přes `git ls-remote origin refs/heads/main`: vzdálený HEAD `14f2f2a5e19c0a1abb95cd831c39aa46ec318724`; lokální `origin/main` stále `286eb325ecc2408ad3a5d4e2acc6ee6041e53f26`. Jde o okamžitý snímek, před integrací je nutná nová kontrola.

`git fetch origin main` byl v původním checkoutu zablokován oprávněními při zápisu `.git/FETCH_HEAD` (Operation not permitted). Publikace byla následně připravena v samostatné pracovní kopii založené přímo na aktuálním vzdáleném mainu. Tři konflikty byly vyřešeny se zachováním nového společného appearance dialogu/showroomu a oprav pro telefony. Aktuální výsledek a kontroly popisuje [INTEGRATION_VERIFICATION.md](../premium-series/INTEGRATION_VERIFICATION.md).

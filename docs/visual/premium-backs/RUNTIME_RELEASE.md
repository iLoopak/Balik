# Aktivace pěti rubů · 2026-10-18

PR #20 přidal imagegen ruby pouze jako návrhy v dev galerii. Runtime registry
stále ukazovala na staré SVG, takže ani merge nezměnil rub ve skutečné hře.
Tato oprava přepíná všech pět decků na existující WebP v `/decks/art-backs/`:
BIO//PUNK, PANELÁK 3000, CHALUPA!, PAPÍROVÝ CIRKUS a Stormpunk.

Sdílený CardBack tak používá stejné nové ruby ve hře, v showroomu i veřejných
galeriích. Přednačítání každé edice obsahuje jeden společný rub a 32 stickerů;
je nezávislé na skryté identitě konkrétní karty. Renderer, pravidla ani síťový
protokol nepotřebovaly změnu. Staré SVG jsou dostupné jen pro historické porovnání.

Generátor `art:worlds` zapisuje nové cesty a ověřuje existenci vydaných rubů.
Opakovaná regenerace byla ověřena hashi: nezměnila nové cesty v registry ani
128 vydaných mappingů. Audit nyní dekóduje skutečné aktivní WebP místo starých SVG.

## Ověření nad mainem po PR #20 (`42590f4`)

- `npm test -- --maxWorkers=2 --testTimeout=30000`: **279/279**, 31 souborů.
  Nových pět regresních případů ověřuje skutečný rub v DeckFan, TableStage a
  preload seznamu. Dosavadní testy ověřují shodný rub pro všechny skryté identity.
- `npm run typecheck`, `npm run build`, `git diff --check`: úspěšně.
- `qa:world-assets`: 128 stickerů a aktivní ruby čtyř nových edic úspěšně.
- Sharp kontrola všech pěti rubů včetně Stormpunku: WebP 640 × 896, plně neprůhledné.
- Browser: skutečný CardView s 32 skrytými kartami postupně pro všech pět decků;
  společný showroom zobrazuje nové ruby v náhledech balíčků i na stole.
  Screenshoty v `output/playwright/premium-backs-active/`.

Nové obrazy nebyly generovány ani upravovány. Toto vydání pouze aktivuje existující
výtvarné assety a opravuje integraci a její ověření.

# BALÍK

Moderní webová herna karetních her. První hra: **Prší** pro 2–4 hráče, online přes sdílený kód nebo odkaz, případně sólo proti počítači.
Cílové platformy: web, později Android/iOS (Capacitor) a Steam (Electron/Tauri). Klient je proto čisté SPA bez SSR.

## Rychlý start

```bash
npm install
npm run dev
```

- Web: <http://localhost:5173> (Vite, i z telefonu ve stejné síti přes `Network` adresu)
- WebSocket server: `ws://localhost:8787/ws`; Vite na něj proxuje `/ws`

### Multiplayer ve dvou oknech

1. Otevři <http://localhost:5173>, zadej jméno a klikni na **Vytvořit hru s přáteli**.
2. Ve druhém okně (anonymní okno nebo jiný prohlížeč; obyčejná druhá záložka funguje také, identita je per-záložka) otevři odkaz `http://localhost:5173/r/KÓD`, nebo zadej kód na úvodu.
3. Hostitel klikne na **Rozdat karty**.

Obnovení stránky tě vrátí na stejné místo u stolu.

### Sólo proti počítači

Na úvodu zvol počet soupeřů (1–3) a klikni na **Hrát proti počítači**. V lobby může hostitel počítačové hráče i přidávat a odebírat. Boti běží na serveru a táhnou se zpožděním odpovídajícím délce animací.

### Dev boti z terminálu

```bash
npm run bot -- KÓD 2     # připojí 2 boty do existující místnosti
```

### Produkce

```bash
npm run build
PORT=8080 npm start      # jeden Node proces: statický web + WebSocket na /ws
```

## Testy a kontrola kvality

```bash
npm test             # unit testy pravidel + RoomManager + reálný WS server
npm run typecheck
npm run qa:e2e       # vyžaduje běžící `npm run dev` a nainstalovaný Google Chrome
```

`qa:e2e` (`scripts/e2e-play.mjs`) v headless Chromu odehraje celé partie: desktop + dotykový telefon v portrétu, odvetu, reconnect uprostřed hry, sólo proti botům, hru 4 hráčů s dlouhou rukou a reduced-motion. Každý snímek měří *computed* pozici všech karet (bere ohled na WAAPI). Teleport (dlouhý pohyb provedený v jediném snímku) test shodí. Hlídá také zaseknuté overlaye a odmítnuté akce. Screenshoty ukládá do `qa-output/`.

## Struktura

```
packages/
  shared/   čistý TypeScript bez Reactu/WS
            cards.ts         balíček, RNG, míchání
            prsi/engine.ts   pravidla Prší (čisté funkce, deterministické s RNG)
            prsi/view.ts     projekce stavu a událostí pro konkrétního hráče (skrytá data)
            prsi/bot.ts      strategie počítačového hráče
            protocol.ts      typy zpráv klient ↔ server
            schema.ts        zod validace (jen server: `@balik/shared/schema`)
  server/   Node + ws
            rooms.ts         místnosti, lobby, reconnect, autoritativní hra, boti (bez transportu → testovatelné)
            server.ts        HTTP (statika + /health) a WebSocket transport
            bot.ts           dev skript s externími boty
  web/      React + Vite + Motion
            net/             WS klient (reconnect, ochrana proti dvojitému odeslání), zustand store
            cards/           vrstvená karta + skin (sticker mapping, frakce)
            table/           stůl: display state, cue director, layout, animace, HUD
            screens/         úvod, pozvánka, lobby, hra
```

Hranice: **room transport** (`server/rooms.ts`, `protocol.ts`) ↔ **game engine** (`shared/prsi/*`) ↔ **presentation** (`web/table/*`) ↔ **animation cues** (`web/table/display.ts` + `useDirector.ts`). Další hra = nový modul vedle `prsi/` a jeho cue mapování. Lobby, transport ani komponenty karet se kopírovat nemusí.

## Pravidla Prší (MVP varianta)

- 2–4 hráči, každý 4 karty, 32 karet (7–A × ♥♦♣♠). Rozdává se po jedné, začíná hráč, který je na řadě; v dalších kolech se začínající hráč posouvá.
- Hraje se karta stejné **barvy** (platné barvy) nebo stejné **hodnoty** jako vrchní karta.
- **Q (svršek)** jde zahrát na cokoli (mimo aktivní trest za 7) a hráč zvolí novou barvu. Volba je součástí jedné akce, takže nevzniká race condition.
- **7**: další hráč bere 2, nebo přiloží svou 7 (trest se sčítá +2, +4, …). Kdo trest přijme, dobere součet a jeho tah končí. Proti trestu lze hrát jen sedmičku.
- **A**: další hráč stojí. Ve dvou hráčích hraje ten, kdo eso zahrál, znovu.
- Nemáš co hrát? Lízni si 1 kartu. Pokud líznutá karta sedí, můžeš ji v tomtéž tahu zahrát (jen ji), jinak/nebo „Nehraju“ a tah končí.
- **J, K, 8, 9, 10** jsou běžné karty. „Poslední karta“ se nehlásí.
- Vyhrává, kdo se první zbaví karet. Partie končí okamžitě, i když je poslední karta 7 nebo A.
- **Úvodní karta**: speciální karty (7, Q, A) se při otáčení vrací pod balíček, dokud nahoře není obyčejná karta, takže efekt nikdy neplatí od začátku.
- **Prázdný balíček**: odhazovací balíček kromě vrchní karty se zamíchá zpět. Pokud nejsou karty ani tak, hráč jich dostane méně (případně žádnou) a tah pokračuje.
- Hráč, který hru opustí, má karty vrácené pod balíček. Zůstane-li jediný hráč, vyhrává.

## Animační systém (motion-first)

Server je jediný zdroj pravdy: posílá **snapshot** pro daného hráče a **události** (`roundStarted`, `cardPlayed`, `suitChanged`, `drawPenalty`, `cardsDrawn`, `deckReshuffled`, `turnSkipped`, `passed`, `turnChanged`, `playerRemoved`, `roundWon`) s rostoucím `seq`. Události jsou per hráč filtrované: soupeř nikdy nedostane identitu tvých dobraných karet.

Klient (`useDirector`):

- každou událost převede na **cue kroky** (`display.ts`) se třemi vrstvami: *objekt* (karta letí), *efekt* (náraz, +N, PŘESKOČENO, výbuch barvy) a *význam* (krátký text);
- kroky přehrává po sobě; při frontě zrychluje, nikdy neblokuje pravidla;
- deduplikuje podle `seq`. Při mezeře, `reset` (reconnect), skryté záložce nebo návratu na záložku skočí rovnou na snapshot bez přehrávání;
- po vyprázdnění fronty vždy srovná zobrazení se snapshotem, takže chyba nemůže přetrvat;
- dočasné efekty mají vlastní TTL a při resetu se mažou, takže nic nezůstane viset.

Všechny karty žijí v jedné absolutně pozicované vrstvě (`layout.ts` počítá cílové transformace). Přesun mezi zónami je jen změna cíle, takže karta nikdy neteleportuje a změna velikosti okna plynule přepočítá pozice. Dopad karty je imperativní akcent (`useAnimate`), který rerendery nerestartují.

`prefers-reduced-motion` nebo přepínač v menu: bez přeletů, s rychlejší frontou; text a barevný feedback zůstávají. Při nízkém výkonu (medián snímku > 28 ms) se zapne odlehčený režim: kratší cue a méně částic.

## Karty a balíček Stormpunk

**Stormpunk** je výchozí vizuální balíček: 32 samostatných transparentních WebP ilustrací,
čtyři frakce **Výheň / Pohyb / Podrost / Bouře**, jednotné SVG ikony a čistý světlý líc.
Pravidla a herní data dál používají původní barvy a hodnoty; mapování je pouze prezentační.

- Galerie: <http://localhost:5173/dev/deck-stormpunk> — 32 karet, filtr frakcí, detail,
  mobilní velikost a překryv ruky, světlý/tmavý stůl, rub, srovnání s klasikou a samostatná animace stickeru.
- Klasický balíček: <http://localhost:5173/?deck=classic> nebo `<CardView deck="classic" … />`.
- Manifest: `web/src/decks/stormpunk/manifest.ts`; assety: `web/public/decks/stormpunk/stickers/`.
- Sticker je samostatná vrstva `[data-layer="sticker"]`, nezávislá na podkladu, indexech i herních animacích.
  Při chybě načtení assetu se karta zobrazí v klasickém vzhledu.

Přesné integrační API, původ a prompty všech ilustrací, export a stav QA:
[Stormpunk dokumentace](packages/web/src/decks/stormpunk/README.md).

## Známé limity (MVP)

- Stav místností je v paměti serveru, restart serveru je ukončí.
- Bez účtů, chatu, zvuků a nastavení variant pravidel.
- Boti jsou jednoduchá heuristika, ne silný soupeř.
- Sólo hra potřebuje server. Engine je ale čistý TS, takže offline režim (Capacitor/Steam) půjde spustit přímo v klientovi.

## Herní efekty / Game feel lab

Interní playground: <http://localhost:5173/dev/game-feel> (bez serveru).
Přehrává zahrání, dobrání, změnu barvy, eso/STOP, demo změny směru, +2,
poslední kartu, výhru a řetězec +2 → +4 → +6. Obsahuje přepínání frakcí,
mobilního stolu, tempa, reduced motion a slabšího zařízení; zkratky 1–9.

Modul `web/src/effects/` přidává presety, frakční trail/impact primitiva,
typované události a `EffectOrchestrator`, napojené na existující cue director.
Herní pravidla, síťový protokol i přesuny karet dál zůstávají v původních vrstvách.
Změna směru je pouze demo/API pro budoucí hry; Prší toto pravidlo nemá.
Architektura, hotové efekty, výkon a limity ověření:
[Game feel dokumentace](packages/web/src/effects/README.md).

## Provoz a nasazení

Doporučené hostované MVP: Vercel pro web a Supabase pro trvalé místnosti,
ověřování tahů a doručování hráčům. Nastavení účtu, migrace, funkce a přesné
proměnné Vercelu: [Supabase](docs/SUPABASE.md).

Frontend komunikuje přes `GameTransport`, přenositelný backend přes `RoomRepository`.
Lokální `npm run dev` dál používá původní Node/WebSocket adaptér. Samostatný
Node server nebo Docker zůstává alternativou pro jiný hosting:
[Nasazení Node backendu](docs/DEPLOYMENT.md). `vercel.json` nasazuje pouze Vite web.

## Stormpunk command arena

Stůl sdílí `GameTableTheme` mezi hrou a `/dev/game-feel`. Jemný ambient reaguje
na aktivní frakci a respektuje reduced motion i lite režim. Sizing tokeny v
`responsiveCardScale.ts` zvětšují běžnou desktopovou ruku o 20–35 % a rezervují
místo pro střed, ovládání a zvednuté karty. Dlouhá ruka přechází do dvou řad.
Geometrické testy kontrolují 8 rozměrů včetně mobilu na šířku a až 31 karet;
živá vizuální kontrola v prohlížeči zatím nebyla provedena.

## BALÍK personality · vlna 1

Platformová značka je nezávislá na edici karet: BLIK (pohyblivé SVG pouzdro),
originální krátké syntetické SFX, mute/hlasitost a šest síťových reakcí se
serverovým cooldownem. Výsledky používají skutečné skóre a hostitel může přejít
na odvetu nebo zpět do stejné lobby. Nový dev-only playground je `/dev/brand`.
Audit, API, rozdělení vrstev a limity ověření:
[Brand & feel](docs/brand/BALIK_BRAND_AND_FEEL.md).

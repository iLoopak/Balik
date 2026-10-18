# BALÍK

Moderní webová herna karetních her. **Prší** pro 2–4 hráče a **Sedma** pro 2 nebo 4 hráče, online přes sdílený kód nebo odkaz, případně sólo proti počítači.
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

Na úvodu zvol hru a počet soupeřů (Prší 1–3, Sedma 1 nebo 3) a klikni na **Hrát proti počítači**. V lobby může hostitel počítačové hráče i přidávat a odebírat. Boti běží na serveru a táhnou se zpožděním odpovídajícím délce animací.

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

- Node/WebSocket adaptér drží místnosti v paměti. Supabase je ukládá trvale přes přenositelný repository adaptér.
- Bez povinných účtů a volného chatu. SFX a rychlé reakce jsou společné oběma hrám.
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

## Sedma · vlna 2

Na úvodu zvol Prší nebo Sedmu. Sedma nabízí 1v1 a 2v2 (protější hráči v týmu),
štychy s pokračováním, esa/desítky po 10 bodech a výchozí bonus za poslední
štych +10. Při vytvoření lze bonus vypnout; pak je možná remíza 40:40.
Tři hráči nemohou rozehrát Sedmu. Odveta zachová hru, variantu a výhry.

- Pravidla, příklady, architektura a QA: [Sedma](docs/games/SEDMA_RULES.md).
- Čistý modul `shared/sedma`, dispatcher `shared/games.ts`; Prší se nepřepisuje.
- Obě hry sdílejí oba backendy, transport, lobby, identitu, emotes, BLIK,
  výsledkový shell, CardLayer, pohybové tokeny a vrstvené karty/stickery.
- Pro publikaci W2 sestav a nasaď funkci `game` i frontend. Nová SQL migrace
  ani změna proměnných prostředí není potřeba. Viz [Supabase](docs/SUPABASE.md).

## Herní večer · vlna 3

Po dohrání zůstáváte u stejného kódu. **Odveta** pokračuje stejnou hrou,
**Změnit hru** otevře společné hlasování, **Přehled večera** ukáže celkové
výhry, odehrané partie a historii. **Konec večera** uloží závěrečný souhrn;
každý z něj může odejít na úvod.

Hlasy patří připojeným lidem, boti nehlasují. Nadpoloviční většina určí hru;
bez ní čekáme na všechny hlasy a při shodě vybírá hostitel z vedoucích her.
Hostitel vždy potvrdí rozdání. Sedma se třemi připojenými nejde vybrat a
odpojené obsazené místo čeká na návrat nebo původní ochrannou lhůtu.

Výhry a odehrané partie jsou společné. Body Sedmy patří jen do detailu hry.
Odchozí zůstává ve výsledcích, stejná identita se může vrátit, nová začíná od
nuly. Souhrn a agregáty zahrnují celý večer; timeline ukazuje posledních 100
partií. Node nepřežije restart, Supabase používá stávající trvalý room JSON a
jeho úklid opuštěných místností. Starší výsledky se nevymýšlejí při aktualizaci.

Architektura, přechody, souběh a ověření: [Herní večer](docs/HERNI_VECER_FLOW.md).
`npm run qa:supabase` testuje i celý střídající se večer přes skutečný transport.
V prostředí s povoleným prohlížečem lze spustit `npm run qa:evening`, případně
`REDUCED=1 npm run qa:evening`; PNG jsou v `output/playwright/evening`.
Po merge znovu nasaď frontend i funkci `game`. SQL a env se nemění.


## Vizuální edice · vlna 4

Tlačítko **Vzhled** na úvodu, v lobby, během hry i mezi partiemi nabízí Stormpunk,
Retro Arcade (32 původních SVG stickerů) a jednoduchou Klasiku. Karty a prostředí
stolu volíš odděleně. Volba je lokální, uložená v `balik.appearance`; můžeš ji měnit
během partie. Ostatní hráči si ponechají vlastní vzhled. Prší, Sedma, BLIK, emotes,
pravidla a výsledky se tím nemění.

- [Architektura, fallbacky a QA](docs/visual/DECK_THEMES.md)
- [Všech 32 motivů](docs/visual/RETRO_ARCADE_CARD_MAPPING.md)
- Dev-only Deck Lab: `/dev/decks` (`npm run dev`); v produkci se jeho kód nebalí.
- `npm run art:retro`: reprodukce původních vektorových assetů a manifestu.
- `npm run qa:themes`: prohlížečová QA obou edic na desktopu/mobilu a v obou hrách; vyžaduje běžící web/server a povolený Chrome.
- `SHARP_MODULE=/cesta/k/sharp npm run qa:assets`: volitelný raster audit a přehledy do `qa-output/themes` (Sharp je pouze QA nástroj, není závislost hry).

W4 nasazuje pouze frontend na Vercelu. **Supabase funkce, SQL ani proměnné prostředí se kvůli W4 nemění.**

## Lhář · vlna 5

Třetí hra pro **2–4 hráče**: polož 1–4 karty rubem, tvrdíš povinnou hodnotu z cyklu
7–A a další hráč pokračuje, nebo zpochybní poslední sadu. Za lež bere střed autor,
za pravdu vyzyvatel. Vítěz sporu začíná hodnotou napadeného tvrzení. Poslední karta
vyhrává až po uzavření okna pro výzvu. Ve třech se rozdává 11/11/10 od začínajícího.

První partii provede krátký onboarding. Boti používají jen vlastní redigovaný view;
Lhář sdílí lobby, pozvánky, avatary/značku, emotes, odvetu, obě edice a Herní večer.

- [Přesná pravidla, bezpečnost, eventy, QA a nasazení](docs/games/LHAR_RULES.md)
- `npm run qa:lhar` a `REDUCED=1 npm run qa:lhar`: browser QA ve schváleném prostředí.
- `npm run qa:supabase`: reálný Auth/Edge/RLS/Realtime průchod pro 2/3 hráče včetně přechodu Lhář → Prší.

**W5 vyžaduje deploy frontendu i Supabase funkce `game`** (`npm run build:supabase`,
pak `supabase functions deploy game --project-ref <project-ref>`). SQL a env se nemění.


## Postavy BALÍKu a veřejná galerie Arcade

- 16 hráčských postav + 4 rozdílné robotí portréty; volba přes **Postava** v nastavení.
- Avatar se přenáší spoluhráčům, uchová při reconnectu a funguje napříč hrami i edicemi.
- Aktivní ring a přemýšlející mini kartičky vycházejí z veřejného tahu; omezený pohyb má statickou variantu.
- `/dev/avatars`: vývojový přehled všech postav, pickeru, stavů a velikostí.
- `/decks/retro-arcade`: veřejná produkční galerie všech 32 karet, dostupná z úvodu.
- [Architektura, prompty, rozšíření, QA a nasazení](docs/brand/AVATARS.md).

Tato změna vyžaduje nový frontend **i Supabase funkci `game`** (nebo Node server).
SQL, bucket ani proměnné prostředí nepřibývají.


## Světlý režim

V **Vzhled → Režim aplikace** vyber Světlo, Tma nebo Podle systému.
Režim je nezávislý na edici karet i prostředí stolu, ukládá se lokálně a lze
ho přepnout během hry bez nového rozdání. [Materiály, tokeny, FX a QA](docs/visual/LIGHT_MODE.md).
Nasazuje se pouze frontend; Supabase a SQL se nemění.

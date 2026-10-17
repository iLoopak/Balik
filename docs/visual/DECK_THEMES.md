# Vizuální edice BALÍKu — W4

## Audit před změnou

CardView již skládá CardBase, CardIndices, CardStickerLayer, CardEffectLayer a rub.
Stormpunk má úplný manifest 32 WebP stickerů; při chybě ilustrace funguje klasický líc.
Skin, SuitIcon a čtyřrohové indexy však vybírají Stormpunk podmínkami; ACTIVE_DECK se
načítá jen při startu. Rub je společný. Stůl i efektové barvy přímo importují frakce.
Brand má vlastní preference a zůstane samostatný. Pravidla a oba transporty vzhled neznají.

## Návrh

- `themes/registry.ts`: DeckTheme (symboly, inkoust, stickery, indexy, rub), zvlášť TableTheme (ambientní tokeny a geometrie).
- `themes/preferences.ts`: ověřované lokální preference `balik.appearance`; deck a table jsou nezávislé. Žádné zprávy serveru ani změny room/match state. Volba platí i při rozehrané partii a v obou hrách.
- Jediný CardView a stabilní klíče karet zůstávají. Při změně se mění props a asset, žádný restart direktoru. Zakryté karty vykreslují pouze rub, nikdy skrytý líc.
- Brand/logo/BLIK, emotes, zvuky a výsledky zůstávají nezávislé. Efekty zachovají význam i časování, dekorativní paletu získají z registry.
- Fallback líce na klasiku, fallback rubu na neutrální BALÍK. Chyba líce nikdy neurčuje rub.
- Vybraná edice přednačítá všech 32 ilustrací stejně pro každého (nikdy jen skryté karty); ostatní edice se přednačítají až po výběru. Výběr má skutečné CardView náhledy.
- `/dev/decks` je lazy a pouze ve vývojovém buildu: pořadí hodnot, oba decky, rub, malá velikost, světlý/tmavý test, breakpoint a reduced motion, samostatný sticker preview. Původní veřejná galerie Stormpunk zůstává.

## Assety a nástroje

K dispozici je obrazový generátor i tvorba SVG kódem a rasterizace přes Sharp.
Pro tuto edici volíme původní ručně navrženou vektorovou grafiku: přesné geometrické
siluety, kontrola 32 motivů a ostré hrany při malé velikosti jsou přirozeně SVG.
Nejde o generované rastrové náhrady ani placeholdery. `scripts/create-retro-arcade.mjs`
je reprodukovatelný zdroj všech motivů; manifest obsahuje názvy, archetypy a cesty.
Samostatné transparentní stickery neobsahují index, symbol suit ani podklad karty.
Ploché barvy, tmavý obrys, bílý die-cut, tvrdý offset stín a drobná tisková nepřesnost.
Retro centrální ilustrace zabírá o čtvrtinu menší šířku než Stormpunk. Francouzské
suits mají čtyři rozdílné geometrické symboly a kontrastní tmavý inkoust (i žlutá).

Podrobnosti motivů: [RETRO_ARCADE_CARD_MAPPING.md](RETRO_ARCADE_CARD_MAPPING.md).


## Ověření a stav před PR

- `npm test`: **132 testů / 16 souborů**, včetně reálných WebSocket scénářů Prší/Sedmy/večera.
- Nové testy vykreslí všech 32 identit v obou edicích a hrách; kontrolují index, symbol,
  asset i samostatný FX layer. Pro všechny zakryté identity je HTML identické, bez líce a stickeru.
- Kompletní deterministické partie obou her skončí se stejnými událostmi a stavem i při
  přepnutí edice/stolu po každém tahu. Ověřená izolace značky a emotes, lokální ukládání,
  odmítnutí neznámých ID, přednačítání celého vybraného decku a fallback chybějící položky.
- Typecheck, produkční build webu/Node serveru, web se `VITE_GAME_BACKEND=supabase`
  i sestavení Edge bundle prošly. Deck Lab se v produkčním JS nenachází.
- 34 nových SVG (32 stickerů + 2 ruby) prošlo XML parse. Sharp rasterizoval všechny
  stickery v 256 a 48 px; žádný ořez ani plošné pozadí. Celkem **37 757 B** za stickery.
  [Audit alpha a hranic](RETRO_ARCADE_ASSET_AUDIT.json).
- [Přehled 32 skutečných assetů](retro-arcade-contact.png) a [48px čitelnost](retro-arcade-small.png)
  byly vizuálně zkontrolovány. Jsou to rasterizace assetů, **ne screenshoty hry**.

**Zbývá živé prohlížečové QA.** Prostředí má uložený zákaz přístupu na lokální herní
URL; ten se neobchází jiným prohlížečem ani screenshotovým nástrojem. Proto nebyl
proveden desktop/mobile walkthrough ani vyroben screenshot CardView/stolu. Nový
`npm run qa:themes` je připravený, ale zde nespouštěný: testuje 32 stabilních elementů,
obě edice/stoly, mobil/desktop/reduced motion, ruby, živou změnu v Prší i Sedmě, druhého
hráče s odlišnou edicí, reload a emote. PR zůstává draft do této kontroly. Ručně ověř
zvlášť překryv indexů v plné ruce, fokus/Escape dialogu a přepnutí během animace tahu.

## Rozšíření a nasazení

Nová edice přidá DeckTheme, symboly, manifest, samostatné stickery/rub a scope CSS.
Nové prostředí přidá TableTheme. Pravidla, Card ID, transport ani trvalá room data se
nemění. Classic zůstává uživatelská volba i nouzový líc. Chyba rubu použije neutrální
CSS rub BALÍK bez závislosti na identitě karty. Automatické opakování neúspěšného
obrázku není potřeba pro platný tah; změna asset URL umožní nové načtení.

Na Vercelu stačí frontend deploy z merge. **Žádný Supabase redeploy, SQL migrace ani
nové environment proměnné.** Lokální preference nejsou účet, inventář ani paywall.

Kompletní manifesty: [Retro Arcade](../../packages/web/src/themes/decks/retro-arcade/manifest.json),
[Stormpunk](../../packages/web/src/decks/stormpunk/manifest.ts).

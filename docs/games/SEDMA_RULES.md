# Sedma v BALÍKu · vlna 2

## Audit a hranice

Prší má čistý engine a projekce v `shared/prsi`; obě serverové orchestrace byly
navázané přímo na jeho funkce. Protokol, vytvoření místnosti a herní obrazovka
předpokládaly Prší. Transporty, úložiště Supabase, emotes a vrstvené karty jsou
už použitelné společně. W2 přidává malý dispatcher `shared/games.ts`, samostatný
`shared/sedma` a prezentaci štychu. Pravidla Prší se nemění. Raw stav se dál
ukládá jen serverově; klient dostává vlastní projekci a filtrované události.

## Implementovaná varianta

Výchozí česká Sedma podle [popisu Johna McLeoda na Pagatu](https://www.pagat.com/sedma/sedma.html),
nikoli univerzální pravidla všech domácností:

- 32 karet, 2 jednotlivci nebo 4 hráči; protější sedadla tvoří tým (1+3, 2+4).
- Čtyři karty na ruku, rozdávání po jedné ve směru sedadel. Začínající sedadlo
  se v odvetách posouvá jako v BALÍKu, bez samostatné role rozdávajícího.
- Barva nerozhoduje. Do prvního oběhu lze hrát cokoli. Štych zatím drží
  poslední sedma nebo karta hodnoty první karty. Bez přebití jej drží vycházející.
- Po celém oběhu vycházející ukončí štych, nebo pokračuje sedmou či původní
  hodnotou. Pokračovat smí i při vedení vlastního týmu. Ostatní znovu hrají cokoli.
  Bez vhodné karty či s prázdnou rukou se štych ukončí automaticky.
- Bere poslední odpovídající karta. Vítěz první dobírá, pak ostatní po jedné
  dokola do čtyř; po vyčerpání balíčku se pouze dohrávají ruce. Vítěz vynáší.
- Eso i desítka = 10 bodů. Poslední štych +10, celkem 90. Volba **Bez bonusu**
  při vytvoření = 80 bodů a možná remíza 40:40. Vyhrává vyšší součet týmu.

Žádné pálení, osmová varianta, sázky, násobení výher ani tříhra. Jedna partie
znamená jedno rozdání; každý člen vítězného týmu získá jednu výhru v místnosti,
remíza žádnou. Volba bez bonusu nepředstavuje celý soubor slovenských variant.

## Odpojení a integrita

Odpojení zachová sedadlo i štych po stávající ochrannou lhůtu. Tah čeká na
návrat hráče. Explicitní odchod nebo vypršení lhůty ukončí Sedmu kontumačně pro
opačný tým; body z dosud sebraných štychů zůstávají viditelné a výsledek nese
důvod kontumace. Za běžné hry neexistuje automatický timeout lidského tahu.
Boti využívají stejné serverové plánování jako Prší. Klient neurčuje skóre,
vítěze, dobírané karty ani čas a nemůže obnovovat štych mimo pořadí.

## Příklady pro testy

- 9 → A → 7 → 9: poslední 9 bere, eso má 10 bodů.
- K → 7 → A → 8: bere sedma; barva ani pořadí hodnot nic nemění.
- 9 → A, pokračování 9 → 7: bere druhý hráč, stále se porovnává původní 9.
- Eso následované králem: eso zůstává vítěznou kartou.
- V 2v2 se body obou protějších hráčů přičítají stejnému týmu.
- Poslední štych přidá bonus právě jednou; bez bonusu je výsledek 40:40 remíza.

## Ověření

- 98 unit/integration testů: zachování všech 32 karet v každém kroku 160 celých
  deterministických partií; 1v1, 2v2, pokračování, sedmy/shody, týmové body,
  bonus, remíza, kontumace, neplatné akce a soukromé projekce. Stávající Prší
  regrese zůstávají zelené.
- Skutečný WebSocket: celé partie dvou a čtyř klientů, reconnect uprostřed
  štychu, odmítnutí vadné zprávy/rychlého opakování tahu, skóre a odveta.
- Skutečný lokální Supabase: Auth + ověření JWT + Edge Function + Postgres/RLS
  + Realtime přes přesný frontendový `SupabaseTransport`. Celá Sedma 1v1 i
  2v2, reconnect, soukromí rukou, skóre a odvety. Také původní Prší smoke,
  idempotence, emotes a botí deadline. `npm run qa:supabase`.
- Typecheck a produkční build webu, Node serveru i Edge bundlu. Projekt nemá
  samostatný lint příkaz. Geometrické testy zahrnují 320px telefon i landscape;
  testy prezentace sledují zachování React klíče při zahrání a stažení štychu.

### Neověřeno v tomto prostředí

Živou vizuální kontrolu, dotykové ovládání, slyšitelný mix a screenshoty
nepovažujeme za hotové. Spuštění Chrome bylo omezeno sandboxem a následné
otevření `http://localhost:5173` v prohlížeči aplikace automaticky odmítlo uložené
bezpečnostní nastavení, přestože uživatel souhlas v chatu udělil. Další
prohlížečová cesta se nezkoušela.

Pro povolené prostředí je připravený `npm run qa:sedma` (vedle běžícího
`npm run dev`): skutečné UI akce, desktop + dotykový telefon, celé partie,
odvety a PNG stavů do `output/playwright/sedma`. Tento skript zde nebyl spuštěn.
Běžný režim zahrnuje pohyb, režim 2v2 kontroluje také reduced motion. Po spuštění
je potřeba snímky prohlédnout a manuálně posoudit čitelnost/ovládání a audio.

## Nasazení W2

Beze změny databázového schématu a proměnných prostředí. Po merge nasaď web
(Vercel) i autoritativní funkci z aktuálního checkoutu:

```sh
npm ci
npm run build:supabase
npx supabase functions deploy game
```

Původní uložené místnosti bez `gameId` se interpretují jako Prší. Běžící klienty
po aktualizaci obnov; starší frontend nezná nové eventy Sedmy. Nová vlna nemění
hru uvnitř místnosti a nezavádí společný herní večer (to patří do W3).

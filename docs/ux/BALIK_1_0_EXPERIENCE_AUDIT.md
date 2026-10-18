# BALÍK 1.0 · audit zážitku

Stav k 18. 10. 2026, větev `claude/balik-1-0-experience` (z `origin/main` 2272ce7).
Audit jde přes skutečnou aplikaci (Vite + Node server) v headless Google Chrome, ne podle
předpokladů. Co nešlo spustit, je níže označené jako **neověřené** i s postupem.

## Jak se ověřovalo

- `npm run qa:experience` (`scripts/e2e-experience.mjs`): pro každou z devíti her
  - **desktop 1440×900**: start z knihovny (*Hrát proti počítači*), čeká se na vlastní tah,
    zaznamená se nápověda (`data-hint`), otevřou se pravidla, **první tah přes skutečné UI**
    (karta, případně potvrzení / volba barvy / tlačítko), **reload uprostřed partie** (stejná
    místnost a kolo), zbytek partie hraje klient vlastním `sendAction` se strategií, která vidí
    jen hráčův view, až k výsledku. Pak **Odveta** a kontrola, že začalo nové kolo.
  - **telefon 390×844, dotyk, světlý režim**: start z knihovny, první tah ťuknutím, měření
    ovládacích prvků pod 40 px, interaktivních karet mimo viewport a ořezu názvu v liště.
  - Chyby z konzole a `pageerror` shodí běh.
- `npm run qa:showroom`: 6 balíčků × 2 stoly × světlo/tma přepínané živě v běžící hře dvou
  lidí (stav hry a identita karet se nesmí změnit, druhý hráč si drží svůj vzhled, žádný
  rozbitý obrázek), perzistence po reloadu a režim *Podle systému* sledující zařízení.
- Unit testy `packages/web/test/guide.test.ts`: botí partie všech her, v každém kroku nápověda
  pro každé místo jen z jeho view; hint o tahu jen hráči na tahu, čistá funkce, žádné rady
  typu „nejlepší tah“; pokrytí fází Mariáše, Duraku, Lháře, Prší, Sedmy, Pexesa, Oka, Šnapsu a Petra.
- Stávající QA (`qa:e2e`, `qa:sedma`, `qa:evening`, `qa:themes`, `qa:lhar`) jako regrese.

Screenshoty: `qa-output/experience/<hra>-{desktop-first,desktop-result,phone-first,phone-after}.png`
a `qa-output/showroom/*.png` (lokální, git je ignoruje; vzniknou spuštěním skriptů).

## Výsledky po hrách

Čas „k výsledku“ je s `reducedMotion` a botí strategií, slouží jen pro srovnání běhů.

| Hra | Scénář | Stav | Závažnost | Důkaz | Oprava | Co zbývá |
|---|---|---|---|---|---|---|
| Prší | knihovna → tah → reload → výsledek → odveta, 1 bot | ✅ | — | nápověda `prsi.play`, výsledek za 12 s, odveta OK | — | — |
| Prší | telefon, první tah dotykem | ✅ | — | dotyk: 1. ťuk zvedne, 2. zahraje; svršek otevře volbu barvy | — | — |
| Sedma | 1v1, štych, výsledek, odveta | ✅ | — | `sedma.lead`, 60 : 30, odveta OK | blokující úvod nahradila nápověda | 2v2 jen v `qa:sedma` |
| Lhář | tvrzení, výzva, výsledek, odveta | ✅ | — | `lhar.claim`, výsledek za 157 s (dlouhá hra) | blokující úvod → nápověda; indexy tvrzení v jazyce balíčku | — |
| Lhář | telefon, 16 karet ve dvou řadách | ⚠️ | P2 | horní řada má viditelný jen index; střed karty zakrývá spodní řada | — (ťuk na index i dialog *Vybrat 1–4 karty* fungují) | zvážit větší rozestup řad u ≥ 12 karet |
| Šnaps | výměna devítky, štychy, 66 | ✅ | — | `snaps.exchange`, 75 : 17, odveta OK | — | — |
| Durak | útok/obrana, durak | ✅ | — | `durak.attack`, výsledek a pořadí, odveta OK | text výsledku genderově neutrální („Zůstáváš durakem.“) | — |
| Mariáš | volba trumfu, odhoz, hra + sedma, flek, výsledek | ✅ | — | `marias.trump`, „Hra nevyšla, sedma vyšla. Vyhráváš.“, odveta OK | — | — |
| Černý Petr | tah naslepo, výsledek | ✅ | — | `petr.draw`, odveta OK | skryté karty k tahu mají přístupný název | — |
| Oko bere | ještě kartu / stojím, body | ✅ | — | `oko.hit`, dělená výhra 2 : 2, odveta OK | 44px dotyková plocha tlačítek | — |
| Pexeso | otočení dvojice, výsledek | ✅ | — | `pexeso.first`, 8 : 8, odveta OK | skryté karty mají přístupný název | — |
| Všechny | reload uprostřed partie | ✅ | — | 9/9 stejná místnost a kolo, stůl zpět | — | — |
| Všechny | chyby v konzoli | ✅ | — | 0 | — | — |
| Všechny | vzhled 6 × 2 × 2 živě | ✅ | — | `qa:showroom` 24/24 | — | — |

**P0/P1 nalezené a opravené:** žádný zablokovaný ani nelegální tah, únik skrytých karet,
ztracený výsledek ani chybné napojení na místnost se v devíti hrách neukázal. Opravené P1:

- **Teleport karty po zobrazení nápovědy (regrese této vlny, nalezena a opravena před PR).**
  `qa:e2e` hlásil ojedinělý skok karty o 105–154 px v jediném snímku, jen na této větvi.
  Cílený test (sólo Prší na telefonu): s nápovědou 3 skoky v 10 hrách, bez nápovědy 0 v 6,
  `origin/main` 0 ve 4 hrách a 0 ve 3 plných během `qa:e2e`. Příčina: proužek nápovědy
  měnil výšku stolu ve chvíli, kdy karta letěla; Motion přehrává transformace přes WAAPI a
  přecílení letu kartu přeskočí do předchozího cíle. Oprava (`guide/GameGuide.tsx`):
  nápověda mění rozvržení jen tehdy, když se 450 ms nehýbe žádná karta (čte
  `getAnimations()` karet, a jen dokud změna čeká), bez animace výšky; do directoru nesahá.
  První pokus (director hlásil „busy“ přes sdílený store) skoky naopak zhoršil, 7 ve 4 hrách
  i s vypnutou nápovědou, protože synchronní update storu při každém přepnutí rušil Motion.
  Proto je vrácený. Po opravě: 0 skoků ve 12 hrách se zapnutou nápovědou, viz „Testy“.
- **Přístupnost:** interaktivní skryté karty (Černý Petr, Pexeso) byly tlačítka bez názvu
  pro čtečky obrazovky; teď „Skrytá karta“ a u viditelných karet název v jazyce balíčku.

### Opravené P2 v této vlně

- Blokující první spuštění Lháře (3krokový modal) a Sedmy (automatický tip) nahradila
  neblokující sdílená nápověda; tipy zůstávají pod „?“.
- Lhář ukazoval tvrzení v enginových hodnotách (Q) i v balíčku Mariášky (Sv).
- Telefon: v horní liště se ořezával název hry („D…“). Výběr postavy se na úzkých displejích
  z lišty schovává (zůstává v lobby a na úvodu), název hry je vidět. Kód místnosti se
  může zkrátit (celý je v lobby a v odkazu); viz backlog.
- Telefon: tlačítka ovládací lišty měla 38 px; pro dotyk mají neviditelnou plochu 44 px bez
  změny rozvržení. (Měření v `qa:experience` čte vizuální rámeček, proto je dál hlásí jako 38 px.)
- Texty: „Zůstal ti durak.“ → „Zůstáváš durakem.“, „co jsi viděl“ → „co už bylo vidět“.
- Pexeso: motiv ukazoval nemožnou dvojici (dvě srdcové devítky).

## Před → po

- **Katalog:** mřížka devíti písmenkových tlačítek a jeden dlouhý formulář → knihovna titulů
  s motivem mechaniky, detail (o čem hra je, typ, náročnost pravidel), filtr „U stolu“
  s vysvětlením, dvě přímé volby, na telefonu dock pod palcem, na desktopu dva sloupce.
  Hlasování večera a lobby používají stejné motivy.
- **Showroom:** jeden obrázek karty a barevný obdélník stolu, Klasika schovaná jako textový
  odkaz → živý mini stůl ze skutečného rendereru, vějíř rub/figura/číslo, náhled obou stolů
  s vybraným balíčkem, Kontrast označený jako nejčitelnější, Klasika plnohodnotná, jasná
  informace „vidíš jen ty“, jeden dialog pro celou aplikaci.
- **Onboarding:** dva různé blokující tutoriály (Lhář, Sedma), sedm her bez vysvětlení → jedna
  sdílená nápověda pro všech devět her navázaná na fázi a legální tahy, každá situace jednou.
- **Gameplay UX:** viz tabulka; zbylé body jsou v backlogu.

## Backlog (P2, nepřepisováno)

1. Dvouřadá ruka na telefonu (Lhář 16 karet, Durak po sebrání): větší vertikální rozestup,
   nebo vějíř s horizontálním posunem a indikací, aby šlo ťukat i na střed karty.
2. Horní lišta hry na telefonu: „Reakce“ jako ikona, menu jako jediné místo pro zvuk a
   postavu; kód místnosti celý.
3. Nápověda na telefonu zabírá při prvním tahu až ~125 px výšky; zkrátit cíl na jednu řádku.
4. Stůl Oka bere a Pexesa: poslední událost (kdo co otočil / kolik má bank) by mohla mít
   krátký „ticker“ stejně jako Lhář.
5. `qa:experience` hraje proti botům; multiplayer s více lidmi u každé hry pokrývají jen
   `qa:themes`/`qa:sedma`/`qa:evening`/`qa:lhar` (Prší, Sedma, Lhář) a unit testy.

## Testy (stav při odevzdání)

Vše proti `npm run dev` této větve (`BALIK_WEB_PORT=5183 BALIK_WS_PORT=8797`), headless Chrome.

| Příkaz | Výsledek |
|---|---|
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 258/258 (mimo jiné nové `library`, `showroom`, `guide` testy) |
| `npm run build` | ✅ bez varování. JS celkem ~724 kB proti ~702 kB na `origin/main` (+~22 kB za knihovnu, showroom a nápovědu); showroom se stahuje až při prvním otevření Vzhledu. |
| `npm run qa:experience` | ✅ 9/9 her knihovna → výsledek → odveta, reload 9/9, 0 chyb v konzoli. Ojedinělé selhání ťuknutí skriptu na telefonu (Lhář, Oko) při opakování prošlo. |
| `npm run qa:showroom` | ✅ 24/24 (6 balíčků × 2 stoly × světlo/tma) + režim podle systému + perzistence |
| `npm run qa:e2e` | ✅ 22/24, dvakrát po opravě; zbylé 2 jsou informativní kontroly náhodného rozdání (stejně jako `origin/main`) |
| `npm run qa:sedma` | ✅ |
| `npm run qa:evening` / `REDUCED=1` | ✅ / ✅ |
| `npm run qa:themes` | ✅ |
| `npm run qa:lhar` / `REDUCED=1` | ✅ / ✅ |
| `npm run qa:supabase` | ⛔ nespuštěno (viz níže) |

Pozn. ke QA skriptům: `qa:e2e`, `qa:evening`, `qa:themes` a `qa:lhar` na čistém `origin/main`
selhávaly i bez této vlny (ověřeno na samostatném checkoutu `origin/main`): zastaralé texty
tlačítek („Hrát znovu“, „Vytvořit hru s přáteli“, rádio „Lhář“), závod při počítání karet
v Deck Labu, `getByLabel` na `<label>` obalujícím `<select>` a klikání na střed karty, kterou
v ruce překrývá soused. Skripty jsou opravené; `qa:evening` kliká na kartu přes element
(tok večera), skutečné hit-targety a dotyk pokrývají `qa:experience` a `qa:e2e`.

Pozorování (P2): dvoučlenný Černý Petr může skončit dřív, než se člověk dostane na tah
(soupeř hned vyjde a hráči zůstane Petr). Je to legitimní výsledek pravidel; zvážit krátkou
hlášku, proč partie skončila tak rychle.

## Neověřené

- `npm run qa:supabase`: vyžaduje běžící lokální Supabase (`supabase start`, stav v
  `/tmp/balik-supabase-status.json`, API na 127.0.0.1:58321). V tomto prostředí neběžel.
  Změny vlny se Supabase netýkají (žádná změna protokolu, enginu ani funkce `game`), přesto
  před nasazením: `supabase start`, `npm run build:supabase`, `npm run qa:supabase`.
- Fyzický telefon (iOS Safari / Android Chrome): ověřeno jen emulací dotyku v Chrome.
- Čtečky obrazovky (VoiceOver/TalkBack): ověřené jen přístupné názvy v DOM, ne skutečné čtení.
- Zvuk: přepínač a výchozí stav beze změn; slyšitelný výstup headless prohlížeč neověří.

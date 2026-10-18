# BALÍK / Karetní stroj

Herní centrum je společná karetní konzole BALÍKu: zapuštěné přijímací kapsy,
zkosený rám, amber kontakty a charakteristický přehyb pouzdra na spodní hraně.
Karta má konkrétní místo, odkud odchází nebo kam dopadá. Prostor nepřebírá
ilustrace decku a nepřidává ovládání, které by hra neznala.

## Vrstvy a identita

1. **Místnost:** tlumené pozadí, v light režimu teplý pískový materiál.
2. **Konzole:** vlastní plášť, odlitý stín, zapuštěný povrch, rail a přehyb BALÍKu.
3. **Aktivní zóny:** přijímací kapsy podle geometrie skutečných karet, okraj ruky a sedadel.
4. **Ambient:** malý integrovaný indikátor energie a krátké vodicí dráhy skutečných akcí.
5. **Karty:** původní jediná CardLayer, původní entity, assety, indexy a stickery.
6. **UI:** původní přístupné ovládání, stav hráčů, emotes a výsledky nad konzolí.

Značka BALÍKu vlastní rám, přehyb, amber kontakty, štítek a volitelnou přítomnost
BLIKa. `useAppearance.table` vybírá materiál/profil zařízení, nezávisle na
`useAppearance.deck`. Přepnutí pouze karet nepřestaví konzoli ani nespustí efekty.
`useColorMode` vybírá tmavý plášť nebo světlou pískovou variantu; oba profily
podporují oba režimy. Klíč geometrie `oval` zůstává kvůli kompatibilitě uložených
voleb, výsledný rám už oválný není.

Frakce je dočasná vrstva nad zařízením. Výheň má teplý pulz, Pohyb směrové tahy,
Podrost rozvíjení a Bouře elektrický shimmer. Animuje se malý lokální indikátor,
ne celá místnost. Vychází z veřejné zobrazované barvy: Prší z aktivní barvy,
Sedma z poslední karty štychu. Lhář má neutrální prostředí, aby ambient nikdy
neprozrazoval skryté karty. Světlé varianty používají kontrastní efektový inkoust.

## Zóny jednotlivých her

| Hra | Vstup | Centrum |
| --- | --- | --- |
| Prší | DOBÍRÁNÍ / DOBRÁNO na pozici skutečného balíčku | ODEHRÁNO, kapsa pod odhazovací hromádkou |
| Sedma | Malý samostatný podavač u skutečného zásobníku | ŠTYCH, šířka podle skutečných 2 nebo 4 sloupců |
| Lhář | Žádný podavač; hra nemá dobírací balíček | TVRZENÍ, místo pro tajnou sadu a její odhalení |

`consolePocket()` používá tutéž geometrii jako karty. Sedma navíc předává
`deckW/deckH` odpovídající svému skutečnému 35% zásobníku. Ostatní pozice,
fany, cíle animací a velikosti karet se nemění.

## Reakce a životní cyklus

- **Tah:** vlastní hand boundary a malý kontakt na štítku; zobrazený veřejný tah.
- **Zahrání:** dráha od sedadla do středu a opožděné přijetí v kapse.
- **Dobírání/rozdání:** pulz podavače a dráha směrem k hráči.
- **Změna barvy:** lokální akcent přijímací kapsy; indikátor přejde na aktivní barvu.
- **Trest / přeskočení:** lokální barevný akcent, u trestu dráha k adresátovi.
- **Sebrání štychu / středu:** dráha k veřejnému příjemci.
- **Lhář:** výzva a odhalení mají oddělené akcenty v existujících cue krocích.
- **Výhra:** jediný krátký amber okraj a BLIKova reakce; žádná další konfeta.

Prší pouze adaptuje existující `EffectInstance` přes `environmentFromEffects()`.
Sedma a Lhář emitují veřejný `EnvironmentSignal` v okamžiku aplikace existujícího
kroku directoru. Signál neobsahuje kartu, hodnotu, barvu, tvrzení ani pravdivost.
No-op při starém tvrzení nevytváří reakci. Zrychlení je zachyceno při vzniku
reakce; pozdější krok ji nepřečasuje.

Fronta drží nejvýše 4 reakce a 4 časovače. Desktop vykreslí nejvýše 4, mobil 2,
lite/reduced 1 statický akcent bez pohybu. Životnost je nejvýše 1,1 s; staré
časovače se ruší při ořezu, resetu a unmountu. Reconnect, mezera v událostech,
nové kolo a změna viditelnosti zahodí dočasný feedback. Pravidla a odesílání
akcí nikdy nečekají na konzoli. Vše je inertní, `aria-hidden`, `pointer-events:none`
a v izolované vrstvě pod kartami a ovládáním.

BLIK je malý dealer/pozorovatel v podpisu konzole. Respektuje nastavení maskota,
reduced motion i lite; na nízkém landscape se schová jeho portrét. Jeho stavy
jsou pouze kosmetická reakce na poslední veřejný signál.

## Ověření

- `npm test`: 188 testů / 22 souborů. Nových 7 testů pokrývá nezávislost decku,
  oba materiály/profily, markup ve 4 rozměrech (320×440 až 1440×900), rozpočty
  reakcí, skutečné kotvy, zásobník/štych Sedmy, konečnost a rušení fronty,
  filtrování metadat a skutečné události enginů Sedmy/Lháře.
- `npm run typecheck`, `npm run build` a
  `VITE_GAME_BACKEND=supabase npm run build -w @balik/web` prošly.
- `node scripts/preview-environment.mjs` vytvoří
  `qa-output/environment/console-study.svg`: izolovanou studii skutečných cest
  rámu a geometrie kapes ve všech hrách a obou režimech. Karty a ostatní UI
  jsou vynechané. Je to statická studie materiálu/tvaru, nikoli screenshot UI.
- Živá kontrola desktopu, telefonu, dotykových interakcí a časování zbývá.
  Přístup prohlížeče na localhost má v této relaci uložené zamítnutí, proto
  nebyl opakován jinou cestou. PR zůstává draft.

Nasazuje se pouze frontend. Supabase funkce, SQL, proměnné, transport a pravidla
se nemění. Změna navazuje na Premium Light Mode (PR #10).

## Další krok

V živém prohlížeči a na telefonu zkontrolovat kompozici s reálnou dlouhou rukou,
čas dopadu a čitelnost podpisu konzole. Potom lze přidat dva krátké mechanické
SFX pro podavač a příjem karty přes existující audio preference a feedback gate.
Vizuální reakce už mají společné sémantické signály, není nutné měnit pravidla
ani vytvářet další nezávislou herní časovou osu.

## Kabeláž konzole (navazuje na PR #11)

`ConsoleWiring.tsx` přidává pod konzoli a nad ni vrstvu v reálných pixelech
stolu (bez roztaženého viewBoxu):

- **Drážky k hráčům.** Každé sedadlo vede drážkou do zásuvky na hraně rámu.
  Hráč na tahu (`active`) má v drážce pohyblivý amber signál a rozsvícenou zásuvku.
  Vlastní hráč je připojený zářezem balíčku k přednímu tácu.
- **Přední tác.** Zóna vlastní ruky se zkosenými rohy a zářezem. Na tahu se
  rozsvítí její horní hrana. Tác nahrazuje obrys `arena-hand-light` ve světlém
  režimu, záře zůstává.
- **Přístroje slotů.** Vedle DOBÍRÁNÍ je ukazatel zásoby (8 buněk po 4 kartách)
  a počet karet je přímo v popisku slotu (`DOBÍRÁNÍ 23`). Původní `.deck-count`
  pod balíčkem zasahoval do kapsy. Kolem kapsy pro odehrání jsou registrační
  rohy v barvě frakce.
- **Lhář.** Tvrzení je odečet vpravo od slotu TVRZENÍ. Nad slotem
  zakrývalo jmenovku soupeře.

Klid (reduced motion / lite) nechává jen statickou strukturu, signál stojí.
Ověřeno živě v prohlížeči: Prší, Sedma, Lhář, tmavý i světlý režim,
desktop 800–1440 px a telefon 375 px.

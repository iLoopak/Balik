# BALÍK na Supabase a Vercelu

Frontend je statický Vite web na Vercelu. Supabase zajišťuje anonymní identitu,
Postgres, Realtime a funkci `game`. Žádná registrace hráče, e-mail ani heslo nejsou
potřeba. Stávající samostatný Node backend zůstává dostupný jako druhý adaptér.

## 1. Projekt Supabase

1. Vytvoř nový Free projekt, ideálně v evropském regionu. Ulož si databázové heslo.
2. V **Authentication → Providers / Sign In → Anonymous Sign-Ins** povol anonymní
   přihlášení. Hráč se přihlásí automaticky až při vytvoření/připojení místnosti.
   Každá karta prohlížeče má vlastní session, reload zachová stejného hráče.
3. V **Project Settings → API / API Keys** zkopíruj Project URL a veřejný
   **publishable key** (`sb_publishable_…`), případně legacy `anon` key.
   `service_role` ani `sb_secret_…` klíč do Vercelu nebo `VITE_*` nevkládej.
4. Aplikuj migraci a nasaď funkci níže. Funkci nelze nahradit pouze databází
   a Realtime: všechna herní pravidla se ověřují na serveru.

## 2. Migrace a funkce

Z kořene repozitáře, po instalaci Node.js a s přístupem do svého Supabase účtu:

```sh
npm ci
npm run typecheck
npm run build:supabase
npx supabase login
npx supabase link --project-ref TVOJE_PROJECT_REF
npx supabase db push
npx supabase secrets set GAME_ALLOWED_ORIGINS=https://tvoje-aplikace.vercel.app
npx supabase functions deploy game
```

`PROJECT_REF` je identifikátor projektu, nikoliv celá URL. `db push` spustí
verzovanou migraci ze `supabase/migrations/`. Alternativou je zkopírovat obsah
migrace do SQL Editoru **nového prázdného projektu**. Nedělej obojí nad stejnou DB.

Před každým dalším deployem funkce spusť `npm run build:supabase`: z přenositelných
TS zdrojů sestaví `supabase/functions/game/bundle.js`. Generovaný bundle se
necommituje. `index.ts` je pouze Deno vstup do tohoto bundlu.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` a `SUPABASE_SERVICE_ROLE_KEY` dodává hostovaná
funkce automaticky. Jediný náš serverový secret je `GAME_ALLOWED_ORIGINS`:
seznam přesných povolených originů oddělených čárkou, bez koncového lomítka.
Například produkční Vercel doména a vlastní doména. Pro preview přidej jeho
konkrétní origin, nebo používej stabilní preview doménu. Wildcard všech
`*.vercel.app` zde není povolený. Změnu secretu případně dokonči redeployem funkce.

Funkce má zapnuté ověřování JWT v `supabase/config.toml`. Navíc ověřuje uživatele
přes Auth API, nikdy nedůvěřuje `userId` nebo reconnect tokenu z JSON požadavku.

## 3. Úklid databáze

V SQL Editoru spusť jednou `supabase/maintenance.sql`. Zapne hodinovou úlohu Cron,
která volá `balik_cleanup()`. Alternativně vytvoř v Dashboard → Cron vlastní
hodinovou SQL úlohu se stejným voláním, **ne obě současně**.

Úklid odstraní místnosti bez požadavku déle než 5 minut, požadavky starší než den
a doručené zprávy starší než hodinu; z mladších zpráv ponechá posledních 128 pro
hráče a místnost. Připojení hráči obnovují aktivitu heartbeat zprávami. Pokud
úklid nenastavíš, hra poběží, ale databáze bude postupně růst.

Do Realtime publikace patří pouze `balik_player_messages`; migrace to nastavuje.
Tabulku `balik_rooms` do publikace nepřidávej. RLS dovoluje hráči číst pouze
jeho předem filtrované zprávy; syrový stav, členství, request receipts a zápisy
jsou dostupné pouze serverové funkci.

## 4. Vercel

Importuj `iLoopak/Balik`, větev s touto změnou (po merge `main`). Nastav:

| Pole | Hodnota |
| --- | --- |
| Framework | Vite |
| Root Directory | `./` |
| Install Command | `npm ci` |
| Build Command | `npm run build -w @balik/web` |
| Output Directory | `packages/web/dist` |

V **Settings → Environment Variables** přidej veřejnou konfiguraci:

```env
VITE_GAME_BACKEND=supabase
VITE_SUPABASE_URL=https://TVOJE_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nastav Production, případně Preview. `VITE_WS_URL` se v tomto režimu nepoužívá.
Po změně proměnných udělej **nový deploy**, protože je Vite vkládá při buildu.
Ve Vercelu není potřeba spouštět Node backend, Redis ani databázi.

## 5. Ověření po nasazení

- Ve dvou kartách/zařízeních vytvoř a připoj místnost; zkus tah obou hráčů.
- Obnov stránku: stejná karta má dostat vlastní aktuální ruku bez replaye historie.
- Zkus sólo s botem a odvetu. Bot běží na serveru, klient pouze žádá o jeho probuzení.
- V konzoli nesmí být chyby JWT, RLS ani CORS. `401` obvykle znamená problém
  s Auth/klíčem; `403` u funkce chybný `GAME_ALLOWED_ORIGINS`; odmítnuté anonymní
  přihlášení znamená vypnutý provider nebo překročený Auth rate limit.

## Lokální Supabase

Je potřeba Docker. Zdejší porty jsou 58321/58322, aby se projekt nekřížil
s dalšími lokálními Supabase projekty.

```sh
npm run build:supabase
npx supabase start
npx supabase status
```

Automatizovaný integrační test používá pouze lokální testovací projekt:
`npx supabase status --agent no -o json > /tmp/balik-supabase-status.json`,
poté `npm run qa:supabase` při běžící funkci. Obsah souboru jsou lokální
přístupové údaje, necommituje se. Test projde přes skutečný Auth, Edge Function,
Postgres/RLS, Realtime a stejný transport jako web; nenahrazuje vizuální kontrolu.

Do `.env.local` v kořeni nastav `VITE_GAME_BACKEND=supabase`, URL
`http://127.0.0.1:58321` a lokální veřejný/anon klíč z `status`. Pro lokální funkci
vytvoř serverový env soubor s `GAME_ALLOWED_ORIGINS=http://localhost:5173`, poté:

```sh
npx supabase functions serve game --env-file CESTA_K_SERVEROVEMU_ENV
npm run dev -w @balik/web
```

Do stejného seznamu originů přidej adresu používanou telefonem při testování v LAN.
Bez `.env.local` nebo s `VITE_GAME_BACKEND=websocket` dál funguje `npm run dev`
s původním Node serverem. V produkci lze stejným přepnutím vrátit web na samostatný
backend a nastavit `VITE_WS_URL`; již běžící Supabase místnosti se tím automaticky
nepřenesou.

## Přenositelnost a chování

- `packages/shared` je jediný engine pravidel a filtr skrytých informací.
- `packages/backend/src/model.ts` a `application.ts` pracují s obyčejnými daty.
  Nemají závislost na SDK Supabase ani na běžícím procesu.
- Port `RoomRepository` vyžaduje atomické uložení verze, zpráv a request receipt.
  `SupabaseRoomRepository` ho implementuje přes Postgres RPC; jiný poskytovatel
  může implementovat stejný kontrakt.
- Frontend používá `GameTransport`; Supabase SDK a databázová jména zůstávají
  v transportním adaptéru. Herní UI dostává původní `ServerMessage`.
- Realtime funguje jako oznámení o nových zprávách. Adaptér je dočte v pořadí
  z trvalého deníku, deduplikuje revize a při mezeře přejde na aktuální snapshot.
- Každý příkaz má UUID; retry používá stejné UUID. Souběžné tahy hlídá verze
  místnosti i herní `baseSeq`. Server má sdílený limit 120 požadavků/minutu/uživatele.
- Botův deadline je v DB, žádný `setTimeout` v Edge Function. Připojené klienty
  budí termínem a heartbeat zprávami; server ověří termín a vypočítá legální tah.
  Při zavření všech klientů se bot pozastaví, po reconnectu pokračuje. Není potřeba
  placený worker ani častý Cron. Při změně klientských hodin pomůže heartbeat.
- Hráč se označí offline po 45 sekundách bez požadavku. Odstranění přijde po dalších
  45 sekundách v lobby nebo 120 sekundách během hry, při nejbližším požadavku
  jiného hráče. Explicitní odchod je okamžitý.
- Restart funkce neztratí místnosti. Free projekt Supabase se přesto může po
  delší neaktivitě pozastavit a platí limity Auth, funkcí a Realtime.

Primární dokumentace:
[Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous),
[Realtime a RLS](https://supabase.com/docs/guides/realtime/postgres-changes),
[Edge limits](https://supabase.com/docs/guides/functions/limits),
[Free tarif](https://supabase.com/pricing).

Lokálně prošel integrační test přes skutečný Supabase stack v Dockeru. Hostovaný
projekt, veřejné TLS a konkrétní Vercel doména se ověří po nastavení tvých účtů.
Živá vizuální kontrola v prohlížeči zatím neproběhla.

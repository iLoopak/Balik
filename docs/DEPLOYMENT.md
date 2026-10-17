# Nasazení BALÍK: Vercel web + jedna Node instance

Web běží na Vercelu, autoritativní multiplayer na samostatné dlouhodobě běžící
Node službě. Pro aktuální MVP je to nejmenší spolehlivé nasazení: místnosti,
připojení a časování botů zůstávají ve stejném procesu. Redis není potřeba.

Tohle je výchozí způsob nasazení, ne závislost aplikace na poskytovateli.
Frontend je běžný statický Vite build a backend standardní Node proces s otevřeným
WebSocket protokolem z `packages/shared`. Adresa backendu se nastavuje přes
`VITE_WS_URL`; bez ní klient použije `/ws` na vlastní doméně. Obě části lze
přesunout na jiný hosting nebo opět obsluhovat jediným serverem. Při změně adresy
stačí nový build webu; pravidla hry a protokol se nemění. Vercel konfigurace ani
Docker nejsou potřeba pro lokální vývoj.

## 1. Backend

Hosting musí podporovat vlastní Node proces nebo Docker, WebSocket Upgrade,
veřejnou HTTPS doménu a **jednu instanci / repliku**. Nasazuj kořen repozitáře.

- Dockerfile: `Dockerfile` v kořeni, build context také kořen.
- Port: `8787`, případně hostitelem přidělený `PORT`.
- Bind: `HOST=0.0.0.0` (již výchozí).
- Health check: `/health`.
- WebSocket: `/ws`.

Lokální ověření kontejneru:

```bash
docker build -t balik-server .
docker run --rm -p 8787:8787 balik-server
curl http://localhost:8787/health
```

Bez Dockeru: `npm ci`, `npm run build -w @balik/server`,
`npm run start -w @balik/server`. Pro běžící backend zajisti veřejnou TLS doménu,
například `https://backend.example.com`. WebSocket adresa pak je
`wss://backend.example.com/ws`. Nevkládej sem doménu frontendu.

Při restartu nebo novém nasazení backendu se aktuální místnosti ztratí. Backend
nesmí mít více replik bez další úpravy úložiště a koordinace mezi instancemi.

## 2. Vercel

Na obrazovce New Project ze screenshotu nastav:

| Pole | Hodnota |
| --- | --- |
| Repository | `iLoopak/Balik` |
| Root Directory | `./` |
| Application / Framework Preset | **Vite** |
| Install Command | `npm ci` |
| Build Command | `npm run build -w @balik/web` |
| Output Directory | `packages/web/dist` |
| Environment Variable | `VITE_WS_URL=wss://VEŘEJNÁ-DOMÉNA-BACKENDU/ws` |

Root `vercel.json` už určuje build i output; v dashboardu není nutné je znovu
přepisovat. Změň automaticky rozpoznané **Services** na **Vite**. Tento setup
nasazuje jen frontend; backend se spouští samostatně podle předchozí části.

`VITE_WS_URL` je veřejná adresa, nikoliv tajný klíč. Vite ji vkládá do JS při
buildu: nastav ji před prvním deployem a po změně udělej nový deploy. Pro preview
deployment nastav také Preview environment. Na HTTPS webu musí backend používat
`wss://`, nikoli `ws://`. Frontend a backend nepotřebují žádný Vercel service
binding: prohlížeč otevírá veřejné WebSocket připojení přímo na backend.

Rewrites obsluhují přímé otevření a refresh `/r/KÓD` i `/dev/*`. Obrázky, fonty
a další statické soubory dál obsluhuje Vercel; chybějící assety se nepřepisují na
HTML aplikace. Lokální `npm run dev` dál používá Vite proxy na `/ws`, společné
`npm run build && npm start` dál funguje jako dosavadní jediný Node server.

## Proč teď ne dvě Vercel Services

Vercel už WebSockety podporuje, ale každé nové připojení může skončit na jiné
Function instanci a připojení mají omezenou dobu běhu. Současný RoomManager drží
místnosti pouze v paměti. Pouhé přidání `services.server` do `vercel.json` by sice
připravilo import, ale nezajistilo by sdílení místnosti mezi dvěma hráči.

Až bude potřeba celý backend škálovat na Vercelu, musí se doplnit sdílený stav
místností, atomické provádění tahů a pub/sub pro připojení na různých instancích.
Samotný `REDIS_URL` bez této změny nestačí.

Primární dokumentace ověřená při přípravě:

- [Vercel WebSockets](https://vercel.com/docs/functions/websockets)
- [Vercel Services](https://vercel.com/docs/services)
- [Service configuration reference](https://vercel.com/docs/services/config-reference)

## Stav ověření

Lokálně prošly testy, typecheck, build webu i serveru a Docker build. Kontejner
prošel kontrolou `/health`, změnou portu přes `PORT`, WebSocket Upgrade, vytvořením
a připojením dvou klientů do stejné místnosti, spuštěním hry a pingem.

Veřejná doména backendu zatím není nastavená. Skutečný cloud deployment a TLS
WebSocket připojení na veřejné doméně je potřeba ověřit po jejím přidělení.

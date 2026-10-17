# BALÍK — vlna 1: brand a game feel

## Audit před implementací

Existuje React/Motion stůl s jednou vrstvou stabilních karet, serverovými cue steps,
frakčními efekty, reduced motion/lite režimem a veřejným `/dev/game-feel`.
Pravidla a filtrace jsou v `packages/shared`. Node/WebSocket a nový Supabase
transport mají stejné zprávy; Supabase ukládá filtrovaný deník s revizemi.
Home/lobby a výsledky již fungují, ale nejsou oddělenou značkovou vrstvou.
Audio systém, maskot ani síťové emotes zatím neexistují. Stormpunk tokeny se
používají jen pro vzhled karet a jejich herní FX.

## Plán

- Přidat samostatný `brand` s původním vektorovým maskotem BLIK, sdílenými
  motion/audio tokeny, lokálně uloženým mute/volume a přepínačem maskota.
- Zvuk spouštět v existujícím directoru při skutečných cue steps; reconnect/reset
  jej zruší. Nedělat druhou frontu animací. Interakční zvuk jen po gestu.
- Šest pevně definovaných emotes ověřovat serverem a omezit cooldownem v obou
  backendech. Reconnect nezobrazuje historii reakcí; obsah neobsahuje HTML.
- Doplnit maskota do lobby, připojování/rozdávání a výsledků. U stolu jen malý
  kontextový stav. Zachovat ovládání, boty, připojení a identitu karet.
- Značkový výsledek ukazuje skutečného vítěze/skóre, odvetu a serverem potvrzený
  návrat stejné místnosti do lobby. Dev playground je lazy a pouze pro dev build.
- Ověřit unit/integration, oba buildy a lokální multiplayer na Node i Supabase.
  Živá vizuální kontrola browserem je zatím omezená dříve zamítnutým originem;
  nevydávat SSR nebo geometrii za screenshot skutečné hry.

## Hranice vrstev

`brand` neimportuje žádný deck, frakci ani konkrétní pravidla. Herní prezentace
mapuje existující sémantické akce na obecné značkové podněty. `shared/social`
obsahuje pouze povolená ID/texty a validační kontrakt síťových reakcí.
Supabase a Node jsou implementace doručení, ne autorita pro vizuální styl.

## Dodané API a chování

`BrandMascot({state, size, reduced, decorative, hidden})` je vrstvené originální
SVG: pouzdro, samostatné karty/klopa, oči/pupily, ústa a obočí. Stavy `idle`,
`deal`, `surprised`, `celebrate`, `sad`, `thinking` mají vlastní výraz a omezený
pohyb. `reduced` i OS preference ho zastaví. `hidden` nebo uložené nastavení ho
skryje. U stolu nahrazuje jen malý avatar při čekání/rozdávání, má vyhrazené místo
ve status baru. Není to postava Stormpunku a neimportuje žádnou edici balíčku.

`BrandAudio` vytváří krátké původní triangle tóny a deterministickou papírovou
texturu přes Web Audio. Jeden `BrandInteraction` odemyká AudioContext až důvěryhodným
gestem. Nepodporovaný nebo přerušený kontext nic neblokuje ani nefrontuje.
Mute/volume/mascot jsou lokální preference `balik.brand`; žádný soundtrack, externí
sampl ani autoplay na mountu. `SoundCue` v existujících cue steps spouští rozdání,
dopad, dobrání, speciální tah, změnu barvy a výsledek. Dopad používá stejný čas
letu jako stávající efekt. `FeedbackGate` deduplikuje potvrzené eventy, reset,
opuštění stolu a skrytí karty ruší naplánované zvuky. Klik/výběr/hover a reakce
jsou samostatné krátké interakční podněty.

Šest originálních vektorových reakcí používá pouze ID `gg`, `ouch`, `phew`,
`sure`, `nice`, `again`. Server doplní autora, ID a expiraci 3,2 s. Cooldown 2,5 s
hlídají oba backendy; u Supabase je uložený ve stavu místnosti a přežije výměnu
workeru. Herní `seq` se reakcí neposouvá. Supabase deník přenese signál spolu
s revizí, ale reconnect snapshot signály neobsahuje a transport staré nepřehrává.
Zobrazuje se nejvýše jedna čerstvá reakce na hráče; není volný text ani HTML.
Picker má nativní klávesnicové ovládání a 48px volby; bubliny nejsou klikatelné.

Výsledek používá skutečné serverové jméno vítěze a skóre, BLIKa a krátký podpis.
`Odveta` i `Zpět do lobby` vyžadují hostitele. Nový příkaz `lobby` je odmítnut
za běžící hry; po skončení zachová místnost, hráče a výhry. Dialog drží klávesnicový
focus a na nízkých displejích se posouvá uvnitř panelu. Původní karetní animace,
frakční efekty a jednoznačné předání tahu zůstávají v původním directoru.

## Preview a ověření

`npm run dev`, potom `/dev/brand`: šest stavů, ovládání zvuků, lokální emotes
a vložený existující game-feel playground. Nový lab je lazy import za
`import.meta.env.DEV`, v produkčním bundlu není. Preview stav hry nepoužívá síť.
Statický přehled skutečných vektorových stavů: [BLIK](blik-states.svg).
Přegenerování: `npm run preview:brand` (bez browseru a bez rastrových závislostí).

Automatické kontroly zahrnují autoritu tahu, bota, reconnect, cooldown a jeho
přežití reconnectu/nového workeru, odmítnutí neplatného payloadu, návrat do lobby
se skóre, AudioContext gesture gate/mute/cancel, deduplikaci a SVG stavy.
Lokální Supabase integrační test prochází stejným transportem jako produkční web;
Node integrace používá skutečné WebSockety. Geometrie karet dál kontroluje
desktop, mobil a landscape až do 31 karet.

Živá vizuální, poslechová a klávesnicová kontrola v browseru zatím nebyla provedena
kvůli dříve zamítnutému přístupu k lokálnímu originu. Statická ukázka maskota je
render skutečného SVG, nikoliv screenshot hry. Další doporučený polish je poslech
na telefonu a doladění hlasitostí jednotlivých SFX podle reálných zařízení.

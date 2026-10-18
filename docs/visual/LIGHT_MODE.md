# Premium Light Mode

BALÍK má dva rovnocenné režimy. V **Vzhled → Režim aplikace** lze zvolit
Světlo, Tma nebo Podle systému. Výchozí volba následuje zařízení. Preference
`balik.colorMode` je lokální; synchronizuje se i mezi otevřenými taby a při
nedostupném úložišti dál funguje pro aktuální relaci.

## Vizuální systém

Světlo používá ivory podklad, teplé šedé a charcoal text. Amber akční plocha
zůstává výrazná; drobný text a fokus mají samostatný tmavší amber token.
Měkké stíny mají teplý odstín. Dialogy, lobby, výsledky, toast, herní popisky,
avatar picker a obě veřejné galerie používají stejný základ materiálů.

`themes/colorTokens.css` obsahuje základní paletu i významové role pro HUD,
dialogy, scrimy, chyby, týmy, FX, výběr karet a avatary. Kód přepíná pouze
`data-color-mode` kořenového elementu. `public/color-mode.js` se spustí před
CSS/Reactem a nastaví také `color-scheme` a browser theme-color, takže se
uložená ani systémová volba nemusí nejprve vykreslit v opačné paletě.

## Aréna a edice

Režim aplikace, balíček a prostředí stolu jsou **tři samostatné volby**.
`TABLE_THEMES` poskytuje pro každé prostředí také světlý materiál. Městská
aréna používá pískovou desku a měděné detaily, arkádová herna teplou krémovou
desku s tlumenými fialovými detaily. `GameTableTheme` přidává jemnou strukturu,
zapuštěnou play area, vymezené pozice hráčů a dobírací/odkládací plochy.
Textura je malý opakovaný SVG pattern bez síťového assetu a bez animace.

Statické materiály jsou pod kartami. Změna režimu nepřepočítává geometrii,
nepřipojuje nové karetní entity a neresetuje director ani herní transport.
Systémový listener vzniká jednou mimo StrictMode a při HMR se odpojí.

## Karty a game feel

CardBase, CardIndices, CardStickerLayer a CardEffectLayer zůstávají oddělené.
Papír, ranky, symboly a původní assety obou edic se nepřebarvují. Ve světle
mají karty jemný outline, teplý kontaktní stín a vyšší stín při hoveru,
fokusu a výběru. Geometrii hoveru i vlastní pohyb dál řídí původní CardLayer.

| Feedback | Světlá varianta |
| --- | --- |
| Zahrání a dopad | Kontrastnější částice, teplý kontaktní stín, zachované časování |
| Dobírání | Měděný odlesk na kartě, tmavší barva letícího číselného badge |
| Hover / selection | Fyzický stín a tmavší amber hrana |
| Aktivní hráč / thinking | Kontrastní ring a text, původní tmavé mini ruby |
| Změna barvy | Barevný wash a znak na jemném ivory podkladu |
| Sedmička / penalizace | Červený ink, světlý červený badge a outline |
| Eso / přeskočení | Modrý ink a světlý modrý podklad |
| Výhra | Zelený kontrastní text, zachované částice a rytmus |
| Emotes | Původní brandové ikony, měkčí stín bubliny |
| Offline / ready / winner / danger | Původní významy, čitelné samostatné stavové vrstvy |

`lightEffectInk` vytváří z ediční FX barvy kontrastní ink pro světlý podklad.
Mění pouze efektové barvy, nikoli ilustrace nebo barevnost symbolů na kartách.
Test ověřuje numerický kontrast 4,5:1 pro tyto ink hodnoty vůči ivory panelu.
Časování, počty částic, události a reduced-motion/lite rozpočty jsou stejné.

Galerie při otevření následují režim aplikace; jejich místní přepínač desky
dál umožňuje samostatný náhled. Po změně režimu aplikace se místní náhled
znovu sjednotí s ním. Zavřený dialog Vzhled nenačítá skryté ediční náhledy.

## Ověření a nasazení

Automatické testy ověřují bootstrap před Reactem, preference a storage chyby,
živou systémovou změnu, explicitní override, synchronizaci tabů, odpojení
listenerů, kontrast, obě geometrie na 360/1440 px, zachované rubové soukromí,
asset/ink identitu karet, shodné cue sekvence a reduced-motion rozpočty.

Proběhl TypeScript check a produkční build. **Interaktivní vizuální QA na
desktopu a mobilu není ověřené**: uložené zamítnutí přístupu prohlížeče
k localhostu tento krok blokuje. SSR a tokenové testy ho nenahrazují.
Před schválením vizuálu projít lobby, všechny tři hry, výběr barvy,
Lhářovy dialogy, emotes, výsledky a galerii v obou režimech i se sníženým pohybem.

Nasazuje se pouze frontend na Vercelu. Supabase funkce, SQL, Storage ani
proměnné prostředí se kvůli této změně nemění.

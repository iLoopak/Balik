# Art quality reset — původní audit a čtyři proof-of-concepty

**Historický záznam první fáze.** Uživatel následně schválil směry PANELÁK 3000,
CHALUPA! a PAPÍROVÝ CIRKUS a výslovně zadal dokončení všech tří edic.
Aktuální produkční pipeline, prompty a výsledky jsou v
[premium-series/README.md](premium-series/README.md). BIO bylo na následný požadavek uživatele doplněné do celé rastrové edice podle
zjednodušené v2. Historické porovnání v1/v2 zůstává na `/dev/art-poc`.
Níže uvedené počty a výsledky ověření popisují původní fázi čtyř POC.

Původní stav čtyř nových edic před resetem: **systémově integrované, výtvarně nepřijaté pro
prémiovou edici**. Dosavadní procedurální SVG jsou návrhy motivů. Počet souborů,
unikátní cesty, nízká velikost a úspěšná rasterizace nejsou doklad výtvarné kvality.

## Co je na Stormpunku kvalitnější

Inspekce skutečných WebP: Výheň K, Pohyb J, Podrost 10 a Bouře 9; společně s jeho
manifestem, provenance, exportním skriptem a skutečným CardView. Nové kolekce byly
prohlédnuty po všech 32 motivech v contact sheetech a v živých galeriích.

Stormpunk rozděluje tvary na osvětlenou, střední a zastíněnou plochu. Mosazná
protéza vůdce má odlesky i mechanické spoje, oděv záhyby, kůže modelovaný obličej.
Kurýr se naklání nad foreshortenovaným boardem; věž má kořeny před a za zdivem;
ptačí pera skládají objem křídla. Vnější obrys zůstává dominantní, detail slouží
materiálu a konstrukci. Nelze jej napodobit pouhým přidáním více drobných čar.

Zdroj: `packages/web/src/decks/stormpunk/art-provenance.json`. Vznikl 32 samostatnými
voláními built-in image_gen. `scripts/prepare-stormpunk.py` pouze ořezává podle
alpha, přidává průhledné bezpečnostní okraje, zmenšuje na max. 768 px a kóduje
WebP quality 88. Exportní skript nevytváří samotnou ilustraci.

## Selhání nových SVG

| Oblast | Konkrétní problém | Co musí nový artwork prokázat |
|---|---|---|
| Detail a materiál | Jedna plná výplň a konstantní obrys; kov, list a látka mají stejný povrch. | Odlišné světelné chování a konstrukce materiálů. |
| Anatomie a charakter | Opakovaný ovál hlavy, dvě tečky, lichoběžníkový trup, stejné boty. | Odlišný poměr těla, výraz, gesta a těžiště každého charakteru. |
| Hloubka | Bílý die-cut a offset stín dodávají hloubku pouze okraji. | Překryvy, perspektiva a skutečné vlastní/contact stíny uvnitř motivu. |
| Silueta | Král často znamená stejný trup plus koruna; Q/J jsou zaměnitelné s rekvizitou. | Anatomie a póza musí nést roli i bez rekvizity. |
| Kompozice | Frontální centrované schéma téměř bez příběhu. | Vyvážená asymetrie, směr pohybu, konkrétní dramatický nebo komický okamžik. |
| Styl edic | Shodný stroke a primitivy vytvářejí jednu rodinu ikon se čtyřmi paletami. | Čtyři odlišná média: biomech komiks, vinyl toy, letní komiks, fyzický papercut. |
| Papírový cirkus | Ostré polygonové hrany a bílá linka nejsou fyzické vrstvení papíru. | Tloušťka papíru, vlákna, nepravidelný řez, kontaktní stíny a divadelní světlo. |

Renderer není hlavní příčinou tohoto rozdílu. Má správně oddělený líc, indexy,
sticker a FX. Oba typy assetu umí vykreslit jako img. Velikost ilustrace a alpha
padding se však musí hodnotit ve skutečné kartě: kvalitní velký obrázek může
selhat jako miniatura. Přidání velkého artworku nesmí překrýt indexy.

## Rozsah resetu

První fáze: pouze **čtyři nové ilustrace**, nikoli všech 128. Poslední dodaná věta je uříznutá
za „BIO//PUNK — kr…“; pracovní výběr proto používá K pro BIO//PUNK a výrazné
charaktery ostatních tří světů:

| Edice | Identita | Koncept | Důkaz potřebné změny |
|---|---|---|---|
| BIO//PUNK | hearts-K | Fotosyntetický kolos | Nehumanoidní mutantní anatomie, živé materiály a dramatický cel shading. |
| PANELÁK 3000 | hearts-Q | Robotická domovnice | Osobitá hruškovitá vinylová skulptura, pantofle, klíče a sídlištní humor. |
| CHALUPA! | hearts-J | Sazenicový kurýr | Expresivní dospělý zahradník zachraňuje přetížené kolečko. |
| PAPÍROVÝ CIRKUS | spades-Q | Kartografka snů | Fyzická vrstvená papírová loutka v nevyvážené divadelní póze. |

Prompty a zdroje: `docs/visual/premium-poc/prompts.json` a následný
`provenance.json`. Výstupní koncepty jsou verzované zvlášť od stávajících assetů.
Původní soubory zůstávají zachované pro srovnání; nejsou vydávané za hotový
prémiový artwork. V okamžiku dokončení první fáze chybělo dalších 124 ilustrací.

## Přijímací kritéria pro koncepty

1. Čitelná silueta a hlavní gesto při 64 px; výraz a materiály při 160–300 px.
2. Alespoň tři jasné hodnotové skupiny a smysluplné vlastní stíny.
3. Vlastní anatomie, póza, výraz a velké proporce; žádný sdílený humanoidní template.
4. Jednoznačně odlišné médium každé edice i bez palety.
5. Reálná průhlednost, zachovaný die-cut, celá silueta a bezpečné okraje.
6. Ve skutečném CardView žádné kolize s indexy; přečtení role a motivu před detailem.

Technická kontrola alpha a formátu je nutná exportní kontrola, nikoli art approval.
Čtyři POC stanovují směr k výtvarnému posouzení; teprve podle jejich hodnocení
lze rozšířit novou sérii na zbytek decků.

## Dodané koncepty a export

Čtyři vybrané zdrojové PNG jsou fyzicky uložené v `docs/visual/premium-poc/sources/`.
Přesné vstupní prompty jsou v `prompts.json`, vybrané zdroje a dvě opravné iterace
bezpečného rámování v `provenance.json`. Použit byl **built-in image_gen**, žádný
CLI/API fallback. Nevznikla žádná další karta mimo čtyři uvedené identity.

`SHARP_MODULE=/cesta/k/sharp npm run art:premium-poc` provede pouze export:
ořez podle alpha nad 8/255, motiv do 704 × 704 px, 32 px průhledného okraje,
WebP quality 90 s plnou alpha kvalitou. Nic nekreslí, nepřibarvuje ani nedoplňuje
generické detaily. Hotové čtyři WebP mají dohromady **757 610 B** a jsou v
`packages/web/public/decks/art-poc/`. Samostatný manifest je
`packages/web/src/decks/art-poc/manifest.json`. Produkční mappingy karet zůstávají
na pracovních SVG; nedochází k tiché směsi schváleného a neschváleného artworku.

Všechny vybrané zdroje mají skutečnou alpha a jejich viditelný motiv končí před
okrajem zdrojového PNG. Report je `export-report.json`. Původní BIO a CHALUPA měly
na hraně zdroje špičku obrysu; byly upraveny obrazovým generátorem, nikoli
procedurálně dokresleny. Výstupní WebP mají samostatný bezpečný průhledný okraj.

Živý náhled je pouze vývojový: **`/dev/art-poc`**. Zobrazuje starý/nový artwork na
stejném CardView, 64px sticker, 76px kartu, světlý podklad i zakrytý stav.
`stickerOverride` je explicitní prezentační vstup rendereru použitý jen pro náhled;
je ignorovaný u zakryté karty a nevstupuje do žádné herní identity či zprávy.
Regresní test kontroluje indexy, samostatnou vrstvu i identické ruby s override.
Appearance picker a veřejné galerie pracovních edic mají viditelnou značku studie.

## Kritické hodnocení nových POC

| Koncept | Co již prokazuje | Co zůstává před sérií |
|---|---|---|
| BIO//PUNK | Mutantní těžiště, obří asymetrická paže, průhledná míza, lesklé listy a mechanická turbína. | Největší hustota detailu: při 64 px se kořeny a hrudník slévají. Redukovat mikrotexturu a zvětšit hodnotový kontrast hlavy. |
| PANELÁK 3000 | Osobnost ve tváři, neobvyklá proporce, tři paže, smalt versus látka versus mosaz; čitelné pantofle. | Malá servisní dvířka a klíče jsou při miniatuře druhotné; další postavy nesmí opakovat tento hruškovitý trup. |
| CHALUPA! | Expresivní tvář, dramatická diagonála, fyzická komická nehoda, rozlišené materiály. | Listí a vodní oblouk mohou být pro celou sérii jednodušší; při miniatuře má vyhrávat tvář, noha a kolečko. |
| PAPÍROVÝ CIRKUS | Skutečná tloušťka vrstev, kontaktní stíny, papírová vlákna, loutkové klouby a vlastní dramatická silueta. | Schody i obličej jsou křehké při 64 px; celá série potřebuje důsledně větší vrstvy a méně dekorace. |

Tyto výhrady jsou součástí art review. Ani výrazný posun proti SVG automaticky
neznamená finální schválení stylu, opakovatelnosti 32 karet nebo mobilní čitelnosti.

## Ověření dodané implementace

- `npm run typecheck`, `npm test` (**249 testů / 28 souborů**), `npm run build`
  a `git diff --check` prošly. POC stránka se do produkčního JS nebalí.
- V prohlížeči aplikace byly prohlédnuty všechny čtyři dvojice na skutečném CardView,
  64px stickery a 76px karty. Ověřen světlý podklad i shodné ruby bez POC líce.
- Screenshoty: `output/playwright/premium-poc/{biopunk,panelak,chalupa,cirkus}-comparison.png`.
- Technické testy chrání integraci a skryté informace. Nenahrazují výtvarné hodnocení
  uvedené výše ani nepotvrzují dokončení ostatních 124 ilustrací.

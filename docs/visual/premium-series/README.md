# Prémiové rastrové série

Dokončené edice: BIO//PUNK, PANELÁK 3000, CHALUPA! a PAPÍROVÝ CIRKUS.
Každá přebírá jeden vybraný POC a dostává 31 nových samostatných kompozic:
124 nových ilustrací a čtyři převzaté koncepty, celkem 128 WebP.
BIO bylo doplněné na následný požadavek uživatele a používá zjednodušenou v2.

## Umělecký zdroj

`scripts/art/premium-directions.mjs` popisuje individuální kompozice, anatomii,
gesta a materiály. `queue.json` uchovává 124 přesných zadání a stylové reference.
`approved-pocs.json` určuje čtyři vybrané koncepty. Reference určuje médium;
neslouží jako šablona postavy. Samotné ilustrace vznikají v built-in image_gen.

`generated/{deck}--{suit}-{rank}.json` obsahuje přesný prompt, původní lokální PNG,
referenci a exportní údaje každé karty, včetně převzatých POC. Zdrojové PNG nových
generací zůstávají na uvedené cestě v lokální knihovně generátoru; pro přenos projektu
jsou všechny hotové WebP přímo v repozitáři. Vybrané POC PNG jsou navíc v
`docs/visual/premium-poc/sources/`.

## Export a integrace

1. `npm run art:premium-plan` obnoví plán; nevytváří obrázky a nesahá na exporty.
2. Jednotlivé výsledky generátoru se zapíší do job JSON se skutečnou cestou `source`.
3. `SHARP_MODULE=/cesta/k/sharp node scripts/export-premium-asset.mjs JOB.json`
   provede alpha crop, zmenšení do 704 px a 32px průhledný padding, WebP quality 90.
   Export nic nekreslí. WebP má maximálně 768 px a plnou kvalitu alpha.
4. `SHARP_MODULE=/cesta/k/sharp npm run qa:premium-assets` kontroluje úplnost,
   průhlednost a bezpečné okraje; vytváří přehledy v 174 a 48 px. `--draft` dovolí
   neúplnou rozpracovanou sadu. Technický report není umělecké hodnocení.
5. Výtvarné hodnocení patří do `visual-review.json`: siluety, charakter, médium,
   kompozice, čitelnost miniatur a skutečný CardView. Neodvozuje se z počtu souborů.
6. `node scripts/release-premium-series.mjs` vyžaduje 32 existujících obrázků na
   edici a záznam výtvarné kontroly. Připraví autoritativní `premium-manifest.json`.
   `npm run art:worlds` potom obnoví registry, mappingy a dokumentaci.

Opakované `art:worlds` zachová rastrové manifesty a nepřepíše je SVG studiemi.
Produkční manifest vždy používá celou dokončenou rastrovou sadu. Původní SVG jsou
archivem pro srovnání; stránka `/dev/art-poc` na ně odkazuje explicitně.

## Kritéria

BIO: velké světelné a anatomické plochy, nehumanoidní organismy, silné obrysy,
rozlišený chitin, listy, kůra, membrány a kov; jemná textura je podřízená čitelnosti.

PANELÁK: individuální toy proporce, rozlišený smalt, kov, textil a beton;
sídlištní situace a čitelná mechanická konstrukce.

CHALUPA: výraz a pohyb, konkrétní letní příhoda, dospělé komiksové postavy,
jasný outline a teplé světlo; žádná opakovaná stojící figura s jiným předmětem.

CIRKUS: fyzická tloušťka a vlákna papíru, kontaktní stíny, nepravidelné řezy,
odvážné loutkové pózy a světlo divadla; nejde o ploché vektorové symboly.

Hodnoty, herní suits, skryté identity a síťové zprávy zůstávají stejné.
Rohy s indexy a card base jsou samostatnými vrstvami. Rub je společný pro všech
32 identit daného decku. Tisková sazba a CMYK nejsou součástí webových stickerů.

# Pět aktivních imagegen rubů BALÍK

2026-10-18 · vytvořeno vestavěným **image_gen**, jeden samostatný rastrový návrh pro každou edici. Stormpunk je rozšíření původního zadání čtyř rubů. Všech pět rubů je nyní zapojených v produkčním registru a používá je herní CardBack, showroom, veřejné galerie i přednačítání decku.

Dev galerie: **`/dev/art-backs`**. U každé edice ukazuje skutečný `CardView` líce a aktivního rastrového rubu, archivovaný SVG a miniaturu rubu v šířce 76 px. Světlý/tmavý podklad je lokální stav galerie a nemění appearance preference. Galerie je načítána pouze v dev sestavení.

| Edice | Koncept | Materiály a motivy | Asset |
| --- | --- | --- | --- |
| BIO//PUNK | Živý zámek | Trnové krunýře, jantarové jádro, kořeny, keramika; akcenty čtyř světů | `/decks/art-backs/biopunk.webp` |
| PANELÁK 3000 | Noční vchod | Modelované fasády, smalt, mosaz, teplá okna, textilní prádlo | `/decks/art-backs/panelak-3000.webp` |
| CHALUPA! | Víkendový talisman | Komiksové slunečnice, hřiby, voda, provaz a smaltovaná konvice | `/decks/art-backs/chalupa.webp` |
| PAPÍROVÝ CIRKUS | Divadlo za kartou | Vrstvený papír, masky, loutkářský kříž, hříva, kontaktní stíny | `/decks/art-backs/papirovy-cirkus.webp` |
| Stormpunk | Srdce živého města | Průmyslové dynamo, oheň, dopravní křídla, podrost, výboje | `/decks/art-backs/stormpunk.webp` |

## Výtvarné principy

- Společný velký nápis **BALÍK** v kontrastním středu; žádné hodnoty, rohové indexy či identita konkrétní karty.
- Vlastní materiálový jazyk každé edice podle skutečného referenčního stickeru. Stormpunk používá původní eso Výhně a Bouře jako stylové reference, nikoli estetiku BIO//PUNKU.
- Větší ornamentální hmoty, vyvážený horní a dolní motiv a čitelný střed v malé velikosti.
- Plně neprůhledný rub 5:7. Protipóly jsou kompoziční, ruby nemají přesnou rotační symetrii; čitelný středový nápis určuje orientaci.

## Pipeline a původ

`prompts.json` obsahuje úplnou sadu pěti promptů. Jednotlivé `{deck}.json` navíc zaznamenávají zdrojový PNG, reference a finální export. Vybrané WebP jsou uloženy přímo v repozitáři pod `packages/web/public/decks/art-backs/`; aplikace nezávisí na souborech v uživatelském adresáři generátoru.

Export: `scripts/prepare-premium-backs.mjs` → `640 × 896`, WebP quality 92, běžný centrovaný resize/crop bez deformace. Žádné procedurální dokreslování ani dodatečné skládání nápisu. Skript ověřuje poměr stran a neprůhlednost, zapisuje rozměry a velikost do provenance a generuje dev manifest. Pro prostředí bez lokálního `sharp` lze zadat jeho cestu proměnnou `SHARP_MODULE`.

## Stav a limity

Všech pět rubů je aktivních: BIO//PUNK, PANELÁK 3000, CHALUPA!, PAPÍROVÝ CIRKUS i Stormpunk. Předchozí PR je obsahovalo pouze jako návrhy; následná oprava přepíná runtime registry na existující WebP. Žádné nové generování nebylo potřeba.

`art:worlds` zachovává nové runtime cesty a ověřuje existenci rubů, takže regenerování registry neobnoví staré SVG. Staré soubory zůstávají jen pro historické porovnání. Přednačítá se celý deck včetně jednoho společného rubu; výběr ani síťové požadavky neodhalují hodnotu skryté karty. Testy ověřují skutečné ruby v rendereru, showroomu a preload seznamu.

# Pět návrhů rubů BALÍK

2026-10-18 · vytvořeno vestavěným **image_gen**, jeden samostatný rastrový návrh pro každou edici. Stormpunk je rozšíření původního zadání čtyř rubů. Jde o návrhy k vizuálnímu porovnání, nikoli o náhradu rubů v produkčním registru.

Dev galerie: **`/dev/art-backs`**. U každé edice ukazuje skutečný `CardView` líce a dosavadního rubu, nový návrh a jeho miniaturu v šířce 76 px. Světlý/tmavý podklad je lokální stav galerie a nemění appearance preference. Galerie je načítána pouze v dev sestavení.

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
- Plně neprůhledný rub 5:7. Protipóly jsou kompoziční, návrhy nemají přesnou rotační symetrii; čitelný středový nápis určuje orientaci.

## Pipeline a původ

`prompts.json` obsahuje úplnou sadu pěti promptů. Jednotlivé `{deck}.json` navíc zaznamenávají zdrojový PNG, reference a finální export. Vybrané WebP jsou uloženy přímo v repozitáři pod `packages/web/public/decks/art-backs/`; aplikace nezávisí na souborech v uživatelském adresáři generátoru.

Export: `scripts/prepare-premium-backs.mjs` → `640 × 896`, WebP quality 92, běžný centrovaný resize/crop bez deformace. Žádné procedurální dokreslování ani dodatečné skládání nápisu. Skript ověřuje poměr stran a neprůhlednost, zapisuje rozměry a velikost do provenance a generuje dev manifest. Pro prostředí bez lokálního `sharp` lze zadat jeho cestu proměnnou `SHARP_MODULE`.

## Stav a limity

Výtvarně zkontrolovány všechny návrhy včetně nápisu BALÍK. Nové ruby jsou **návrhy v oddělené galerii**. Dosavadní `back.svg` v deck registry, skutečné skryté karty a herní chování zůstávají beze změny. Dalším krokem po výběru návrhů je jejich napojení do registry a kontrola pickeru, přednačítání a všech herních velikostí.

# Integrace s aktuálním mainem · 2026-10-18

Větev `codex/premium-deck-art` vznikla z čerstvě staženého mainu
`14f2f2a5e19c0a1abb95cd831c39aa46ec318724` (PR #19, telefonní P2 opravy).
Původní rozpracovaný checkout nebyl resetován ani přepsán. Jeho změny byly
přeneseny třícestným patchem a 515 nových souborů zkopírováno bez přepsání
existujících souborů z mainu.

## Vyřešené překryvy

- README zachovává jak popis BALÍK 1.0, tak nové edice a art pipeline.
- Nový `AppearancePicker` a `appearance.css` z mainu zůstaly zachovány.
  Historický study badge ze starého pickeru už dokončené rastrové sady nepotřebují.
- `App.tsx` obsahuje nový společný lazy-loaded appearance dialog z mainu
  i dev galerie konceptů a rubů. Herní knihovna, nápověda a telefonní opravy
  pocházejí beze změn z aktuálního mainu.

Showroom čte registr, takže čtyři nové edice a jejich stoly nabízí automaticky.
Ve skutečném prohlížeči ověřeno otevření společného dialogu, všech deset decků
včetně klasiky, šest stolů, výběr BIO//PUNK a následná nezávislá změna stolu
na Živý obvod. Screenshot: `output/playwright/premium-backs/main-showroom.png`.

## Kontroly

- `npm run typecheck` a `npm run build`: prošly.
- `qa:premium-assets`: 128/128 skutečných transparentních WebP s bezpečnými okraji.
- `qa:world-assets`: 128/128 aktivních stickerů a původní runtime ruby.
- Stavová kontrola premium série: žádné chybějící exporty.
- Testy nad mainem mají 274 případů / 31 souborů. Při souběhu buildů a auditů
  dlouhé botové simulace překročily výchozích 5 sekund; opakování používá
  `npm test -- --maxWorkers=2 --testTimeout=30000`, bez změny testů nebo enginu.
  Toto opakování prošlo: **274/274 testů v 31 souborech**.

Pět nových rastrových rubů je stále návrhová galerie `/dev/art-backs`;
runtime registry nadále používá původní ruby. Veřejné galerie všech čtyř
dokončených rastrových edic a volba vzhledu jsou součástí produkční aplikace.

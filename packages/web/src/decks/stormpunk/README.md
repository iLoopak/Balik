# Stormpunk · BALÍK original edition 001

Complete 32-card visual deck, integrated into the existing `CardView`. The game
engine, protocol, room state, scoring and animation director are unchanged.

## Preview

Run `npm run dev` from the repository root, then open:

- Gallery: <http://localhost:5173/dev/deck-stormpunk>
- Game with Stormpunk: <http://localhost:5173/?deck=stormpunk>
- Game with the original skin: <http://localhost:5173/?deck=classic>

The gallery includes all 32 cards, faction filters, a keyboard-accessible native
modal with previous/next controls, 76px mobile cards, an overlapping hand,
light/dark tables, front/back views, classic comparison and a replayable sticker
animation. Escape closes the detail and the browser restores focus to its opener.
Reduced-motion users get a stationary sticker highlight instead of the hop.

## Integration API

Stormpunk is the default presentation. Existing table and home `CardView` calls
work without changes. A caller can choose a skin explicitly:

```tsx
<CardView card={engineCard} faceUp deck="stormpunk" />
<CardView card={engineCard} faceUp deck="classic" />
```

`skin.ts` exports `DeckId`, `stickerFor`, `suitName`, `suitColor` and `suitTone`.
The shared `themes/registry.ts` resolves editions; `useAppearance` subscribes to
validated local preferences. Players can choose cards and table independently
under **Vzhled**, including during a match. `?deck=classic` (or `retro-arcade`)
is an initial preview override; choosing manually removes that override and
persists the new selection. No room or protocol state contains these preferences.

`stormpunkFor(card)` resolves any existing engine card to its manifest record.
The mapping is hearts → Výheň, diamonds → Pohyb, clubs → Podrost,
spades → Bouře. Stable card IDs and ranks remain exactly the same. The Q still
changes suits according to the existing rules; only its displayed faction changes.
The picker and table labels use the active presentation names and SVG icons.

The manifest contains `id`, `faction`, `rank`, `name`, `archetype`, `stickerAsset`,
`scale`, `offset`, and the engine-compatible `card`. Asset URLs are rooted under
`/decks/stormpunk/stickers/{faction}/{rank}.webp`. Each card uses a single separate
transparent image; no full-card bitmap is generated. If loading an image fails,
that card displays a complete classic face rather than a broken image.

## Layers and sizing

`CardView` retains `CardBase`, `CardIndices`, `CardStickerLayer`, `CardFxLayer`,
and an edition-specific BALÍK back (with the neutral CSS back as an image-error fallback). The off-white base and all index glyphs are
DOM/SVG. Primary indices occupy the top-left/bottom-right and faction icons the
top-right/bottom-left. At widths up to 110px, a small duplicate faction glyph
beside the left index remains visible in an overlapping hand. Faction accent
colors match the brief; darker companion inks improve small-card contrast.

The sticker is contained in the central 54% of the card height and 76% of its
width. Transparent margins make the visible artwork slightly smaller. It never
contains an index or card frame. `scale` and `offset` are available per manifest
entry for art direction. To animate, target `[data-layer="sticker"]` or its image
without moving `.card-base` or the parent card. The gallery animates only the
image so it does not compete with the director's transforms or manifest offsets.

## Artwork and reproducibility

32 distinct illustrations were generated using the built-in `image_gen` tool,
one prompt per asset. `art-provenance.json` records the exact final prompt set
and source PNG paths. Generated originals remain at those local paths; the final
selected deliverables are the 32 transparent WebP assets included with the deck.
No API/CLI image-generation fallback was used. No reference J/Q/A artwork or
`BALIK_CARD_ART_DIRECTION.md` was present in the repository or the supplied files.

`python3 scripts/prepare-stormpunk.py` (Pillow required) converts those originals:
alpha-aware crop, transparent safety padding, max 768px edge, WebP quality 88.
It preserves the generated white die-cut border and alpha. Writes are atomic so
the dev server cannot serve a partially encoded asset. The script also produces
`output/playwright/stormpunk-contact-sheet.jpg` and an asset-size/alpha report.
If the original PNG paths are unavailable on another machine, the shipped WebP
files remain fully functional; generation is not part of the app build.

Current total image payload: 3,642,310 bytes (about 3.47 MiB) for the full set; each card has its own asset URL.
The art deliberately uses one consistent inked comic style. Final human art
review should focus on mobile legibility of the detailed machines and the
Podrost tower's more fantastical architecture.

## Verification

`npm test` includes engine/protocol/server tests and deck checks for complete
engine-card coverage, 32 unique real WebP assets, alpha headers, payload bounds,
classic fallback and presentation-only suit mapping. Also run `npm run typecheck`,
`npm run build` and `git diff --check`.

The contact sheet was visually inspected. Live gallery interactions and the
existing `qa:e2e` browser walkthrough could not be verified in this session:
Chrome could not launch in the restricted shell, and the app browser's permission
gate denied localhost access. Manual desktop/mobile gallery and full-game review
remain necessary. No missing implementation work is known beyond that QA and
human art review. The existing shared BALÍK back is reused.

The original checkout has read-only Git metadata in this environment. Publishing
uses a separate checkout so its working files remain intact.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CardEntity } from '../src/table/display';
import { GameTableTheme } from '../src/table/GameTableTheme';
import { computeGeometry, placeMyHand, type HandUi, type Placement } from '../src/table/layout';
import { responsiveCardScale } from '../src/table/responsiveCardScale';

const order = ['me', 'ada', 'max', 'iva'];
const viewports = [[1920, 1000], [1440, 820], [1280, 672], [768, 900], [390, 740], [320, 500], [844, 320], [667, 295]];
const hand = (count: number): CardEntity[] => Array.from({ length: count }, (_, i) => ({
  key: `card-${i}`, card: null, move: null, moveStamp: 0, spawn: null, delay: 0, flash: null,
}));
const idle: HandUi = { hovered: null, selected: null, pendingKey: null, playable: new Set(), myTurn: true };

function bounds(p: Placement, width: number, height: number) {
  const angle = p.rotate * Math.PI / 180;
  const halfW = (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height) * p.scale / 2;
  const halfH = (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height) * p.scale / 2;
  return { left: p.x - halfW, right: p.x + halfW, top: p.y - halfH, bottom: p.y + halfH };
}

describe('responsive arena layout', () => {
  it('enlarges a normal desktop hand by 20–35% while keeping discard dominant', () => {
    for (const [w, h] of viewports.slice(0, 3)) {
      const oldWidth = Math.min(124, Math.max(78, Math.min(w! * .085, h! * .13)));
      const geo = computeGeometry(w!, h!, order, 'me', 5);
      expect(geo.cardW / oldWidth).toBeGreaterThanOrEqual(1.2);
      expect(geo.cardW / oldWidth).toBeLessThanOrEqual(1.35);
      expect(geo.pileW).toBeGreaterThan(geo.cardW);
      expect(geo.deckW).toBeGreaterThan(oldWidth);
    }
  });

  it('keeps every resting and selected card inside the viewport and below the controls', () => {
    for (const [w, h] of viewports) {
      for (const count of [1, 5, 14, 28, 31]) {
        const geo = computeGeometry(w!, h!, order, 'me', count);
        const cards = hand(count);
        for (const selected of [null, ...cards.map((c) => c.key)]) {
          const placed = placeMyHand(geo, cards, false, { ...idle, selected });
          for (const p of placed.values()) {
            const box = bounds(p, geo.cardW, geo.cardH);
            expect(box.left).toBeGreaterThanOrEqual(0);
            expect(box.right).toBeLessThanOrEqual(w!);
            expect(box.bottom).toBeLessThanOrEqual(h!);
            expect(box.top).toBeGreaterThanOrEqual(geo.controlY + geo.controlHeight);
          }
        }
      }
    }
  });

  it('reserves separate zones for seats, central piles, faction feedback and action labels', () => {
    for (const [w, h] of viewports) {
      for (const count of [5, 14, 28, 31]) {
        const geo = computeGeometry(w!, h!, order, 'me', count);
        const metrics = responsiveCardScale(w!, h!, count);
        const pileHalf = geo.cardH * metrics.pileEnvelope / 2;
        const seatsBottom = metrics.topInset + geo.cardH * geo.oppScale + metrics.seatGap + metrics.seatHeight;
        expect(geo.discard.y - pileHalf).toBeGreaterThanOrEqual(seatsBottom + metrics.zoneGap - .001);
        expect(geo.discard.y + pileHalf).toBeLessThanOrEqual(geo.labelY - 14);
        expect(geo.suitBadge.y + 25).toBeLessThan(geo.labelY - 14);
        if (metrics.badgeBeside) expect(geo.suitBadge.x - 56).toBeGreaterThan(geo.discard.x + geo.pileW / 2);
      }
    }
  });

  it('exposes the chosen theme and suit and disables ambient motion for reduced and lite modes', () => {
    const geo = computeGeometry(1280, 720, order, 'me', 5);
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as const) {
      const html = renderToStaticMarkup(createElement(GameTableTheme, { geo, suit, reduced: false, lite: false, myTurn: true }));
      expect(html).toContain(`data-suit="${suit}"`);
      expect(html).toContain('data-table-theme="stormpunk"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('data-ambient="full"');
    }
    for (const flags of [{ reduced: true, lite: false }, { reduced: false, lite: true }]) {
      const html = renderToStaticMarkup(createElement(GameTableTheme, { geo, suit: 'spades', ...flags, myTurn: false }));
      expect(html).toContain('arena-is-quiet');
      expect(html).toContain('data-motion="off"');
      expect(html).toContain('data-ambient="static"');
    }
  });
});

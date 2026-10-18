/** Shared geometry tokens: size cards first, then reserve space for every table zone. */
export const TABLE_METRICS = {
  aspect: 1.4,
  desktopGain: 1.28,
  desktopMaxCardW: 158,
  desktopHandMaxW: 1100,
  rowOffset: .42,
  /** Phones in portrait: the back row shows more than its index, so a card can be tapped on its face. */
  phoneRowOffset: .62,
  handBottom: .57,
  handHeadroom: .8,
  hoverLift: .17,
  selectedLift: .24,
  emphasisScale: 1.055,
  controlHeight: 44,
  controlGap: 8,
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function responsiveCardScale(width: number, height: number, handCount: number) {
  const short = height < 480;
  const compact = width < 700 || short;
  const edge = short ? 10 : compact ? 12 : 24;
  const topInset = short ? 12 : compact ? 16 : 24;
  const seatHeight = short ? 32 : 40;
  const seatGap = short ? 6 : 10;
  const controlHeight = TABLE_METRICS.controlHeight;
  const controlGap = short ? 6 : TABLE_METRICS.controlGap;
  // Desktop can place the faction indicator beside the pile. Phones need room below it.
  const badgeBeside = !compact || (short && width >= 600);
  const hudClearance = badgeBeside ? 42 : 78;
  const zoneGap = short ? 8 : 12;
  const oppScale = compact ? .44 : .41;
  const discardScale = compact ? 1 : 1.08;
  const deckScale = compact ? 1 : .96;
  const pileEnvelope = discardScale * 1.2;
  const handMaxW = Math.max(1, Math.min(width - 2 * edge, compact ? width : TABLE_METRICS.desktopHandMaxW));
  const original = compact
    ? clamp(Math.min(width * .235, height * .13), 58, 104)
    : clamp(Math.min(width * .085, height * .13), 78, 124);
  const desired = compact ? original : Math.min(TABLE_METRICS.desktopMaxCardW, original * TABLE_METRICS.desktopGain);
  const spread = handCount > 1 ? (handMaxW - desired) / (handCount - 1) : desired;
  const rows: 1 | 2 = handCount > 6 && spread < desired * (compact ? .4 : .42) ? 2 : 1;
  const rowOffset = compact && !short ? TABLE_METRICS.phoneRowOffset : TABLE_METRICS.rowOffset;
  const staticSpace = edge + controlHeight + controlGap + hudClearance + topInset + seatHeight + seatGap + zoneGap;
  const heightUnits = TABLE_METRICS.handBottom + TABLE_METRICS.handHeadroom + (rows - 1) * rowOffset + oppScale + pileEnvelope;
  const verticalLimit = (height - staticSpace) / (TABLE_METRICS.aspect * heightUnits);
  const cardW = Math.max(24, Math.min(desired, verticalLimit, handMaxW));
  return {
    compact, short, cardW, cardH: cardW * TABLE_METRICS.aspect, handMaxW, rows, rowOffset,
    edge, topInset, seatHeight, seatGap, controlHeight, controlGap, hudClearance,
    zoneGap, oppScale, discardScale, deckScale, pileEnvelope, badgeBeside,
  };
}

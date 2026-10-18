/** Contrast-bound UI/FX ink. Original artwork and card suit inks are never changed. */
function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function luminance(hex: string) {
  return rgb(hex).reduce((sum, c, i) => {
    const v = c / 255;
    return sum + (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i]!;
  }, 0);
}
export function contrastRatio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function lightEffectInk(color: string, background = '#fffaf2'): string {
  const original = rgb(color),
    ink = rgb('#252a32');
  for (let amount = 0; amount <= 1; amount += 0.05) {
    const candidate =
      '#' +
      original
        .map((c, i) =>
          Math.round(c * (1 - amount) + ink[i]! * amount)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    if (contrastRatio(candidate, background) >= 4.5) return candidate;
  }
  return '#252a32';
}

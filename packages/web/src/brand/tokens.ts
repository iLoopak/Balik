export const BRAND_MOTION = { response: .16, reaction: .24, ritual: .65, lift: 5 } as const;
export const SOUND_RECIPES = {
  deal: { frequency: 430, end: 300, duration: .075, noise: .3 },
  hover: { frequency: 720, end: 760, duration: .025, noise: .02 },
  tap: { frequency: 300, end: 250, duration: .045, noise: .08 },
  select: { frequency: 520, end: 660, duration: .075, noise: .03 },
  play: { frequency: 180, end: 95, duration: .11, noise: .25 },
  draw: { frequency: 360, end: 460, duration: .08, noise: .35 },
  special: { frequency: 220, end: 440, duration: .19, noise: .04 },
  suit: { frequency: 550, end: 825, duration: .16, noise: .015 },
  reaction: { frequency: 620, end: 530, duration: .10, noise: .01 },
  win: { frequency: 523, end: 1046, duration: .36, noise: .01 },
  lose: { frequency: 330, end: 220, duration: .25, noise: .02 },
} as const;
export type SoundKind = keyof typeof SOUND_RECIPES;

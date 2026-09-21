// The card is an object, not a screen, so its two faces are the same colours in
// both modes -- the same reasoning as the splash. Ratios measured against the
// face each ink sits on.
export const CardPalette = {
  // 8.08:1 with `onGold`. The stops sit either side of it, so the ratio holds
  // across the whole face.
  gold: '#F0A81C',
  goldStops: ['#F7BB40', '#F0A81C', '#DC960F'] as const,
  onGold: '#2A1D06',
  // The corner sweep: the same gold, deepened. Ink still clears 4.5:1 on it.
  sweep: '#C07F08',
  rimStops: [
    'rgba(255, 255, 255, 0.82)',
    'rgba(255, 255, 255, 0.20)',
    'rgba(42, 29, 6, 0.30)'
  ] as const,
  // The back is the app's own light surface and ink, fixed so both modes match.
  paperStops: ['#FFFFFF', '#FBFAF8'] as const,
  onPaper: '#1C1815',
  onPaperSecondary: '#746A60',
  paperSweep: '#F1EFEC',
  rule: 'rgba(58, 48, 38, 0.13)',
  ring: '#FFFFFF',
  // The pill behind an icon on a face. Bare glyphs on gold read as printing on
  // the card rather than as controls.
  pill: 'rgba(42, 29, 6, 0.13)',
  wash: 'rgba(16, 11, 4, 0.66)',
  // The two controls below the card act on it, so they are not of it.
  control: 'rgba(28, 24, 21, 0.62)'
} as const;

export const CardGradientStart = { x: 0.1, y: 0 } as const;
export const CardGradientEnd = { x: 0.9, y: 1 } as const;

export const CardInset = 20;
export const CardRadius = 28;
export const CardRimWidth = 2.5;
export const CardFaceRadius = CardRadius - CardRimWidth;
// The flip control's offset puts it at the centre of the corner sweep.
export const CardFlipInset = 15;
export const CardFlipBottom = 17;
export const CardPhotoSize = 150;
// A card, not a page: the wash stays visible above and below it. Roughly the
// proportion of a real membership card held in one hand.
export const CardAspectRatio = 350 / 566;
export const CardMaxWidth = 380;

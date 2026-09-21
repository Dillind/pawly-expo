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
  // The rim. A real card is laminated, so its edge is a band of light on the
  // lit side and a band of shade on the other -- not a single hairline.
  rimStops: [
    'rgba(255, 255, 255, 0.82)',
    'rgba(255, 255, 255, 0.20)',
    'rgba(42, 29, 6, 0.30)'
  ] as const,
  // 14.30:1 with `onCream`, 5.79:1 with `onCreamSecondary`.
  cream: '#FBEED2',
  creamStops: ['#FEF8EA', '#FBEED2'] as const,
  onCream: '#2A1D06',
  creamSweep: '#F3E2BE',
  onCreamSecondary: '#6B5A3D',
  rule: 'rgba(42, 29, 6, 0.14)',
  ring: '#FFFFFF',
  // A hairline of light along the top edge, the way a laminated card catches it.
  edge: 'rgba(255, 255, 255, 0.34)',
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
// The flip control sits at the optical centre of the corner sweep, not in the
// corner. Measured against the sweep path in `card-sweep.tsx`.
export const CardFlipRight = 31;
export const CardFlipBottom = 35;
// The back's corner is smaller and on the left, so its control sits closer in.
export const CardBackFlipLeft = 15;
export const CardBackFlipBottom = 17;
export const CardPhotoSize = 150;
// A card, not a page: the wash stays visible above and below it. Roughly the
// proportion of a real membership card held in one hand.
export const CardAspectRatio = 350 / 566;
export const CardMaxWidth = 380;

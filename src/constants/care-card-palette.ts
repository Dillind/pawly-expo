// The card is an object, not a screen, so its two faces are the same colours in
// both modes -- the same reasoning as the splash. Ratios measured against the
// face each ink sits on.
export const CardPalette = {
  // 8.08:1 with `onGold`.
  gold: '#F0A81C',
  onGold: '#2A1D06',
  // 14.30:1 with `onCream`, 5.79:1 with `onCreamSecondary`.
  cream: '#FBEED2',
  onCream: '#2A1D06',
  onCreamSecondary: '#6B5A3D',
  rule: 'rgba(42, 29, 6, 0.14)',
  ring: '#FFFFFF',
  wash: 'rgba(20, 14, 4, 0.46)',
  washControl: 'rgba(255, 255, 255, 0.20)'
} as const;

export const CardInset = 20;
export const CardRadius = 28;
export const CardPhotoSize = 150;

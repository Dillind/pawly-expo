/**
 * Theme tokens for light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const COLORS = {
  light: {
    text: '#1C1815',
    background: '#FAF6EF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F3EDE2',
    backgroundSheet: '#FFFFFF',
    backgroundSheetRow: '#F3EDE2',
    // A Post fills the screen width, so it has no edge of its own -- the band
    // between two of them is the only thing that separates them.
    postSurface: '#FFFFFF',
    postDivider: '#FAF6EF',
    textSecondary: '#7B7167',
    border: 'rgba(58, 48, 38, 0.13)',
    error: '#CE3C39',
    like: '#E0405E',
    // A fill, never text: #F0A81C on white is 2.0:1.
    primary: '#F0A81C',
    primaryMuted: 'rgba(240, 168, 28, 0.14)',
    // A gold label. Clears 4.5:1 where `primary` cannot.
    primaryText: '#9E6404',
    onPrimary: '#2A1D06',
    success: '#10696B',
    // The dashed "Other" row and the "Add a pet" ghost row.
    ghostBorder: 'rgba(58, 48, 38, 0.20)',
    // The ink for a control floating over a photo. It cannot be `text`: the
    // photo is arbitrary, so a near-black glyph vanishes on half of them.
    onGlass: '#FFFFFF',
    shadow: '#4A3A26'
  },
  dark: {
    text: '#FBF7F2',
    background: '#14100E',
    backgroundElement: '#201A17',
    backgroundSelected: '#2C2521',
    backgroundSheet: '#1B1613',
    backgroundSheetRow: '#2C2521',
    // Dark reverses the light pairing: a Post on anything but black loses the
    // photo's own black.
    postSurface: '#000000',
    postDivider: '#201A17',
    textSecondary: '#A99C90',
    border: 'rgba(255, 255, 255, 0.14)',
    error: '#E05B58',
    like: '#FF4D6D',
    primary: '#F5B435',
    primaryMuted: 'rgba(245, 180, 53, 0.20)',
    // On a dark ground gold IS readable as text, so the two collapse. Keep the
    // token: the call sites must not know which mode they are in.
    primaryText: '#F5B435',
    onPrimary: '#2A1D06',
    success: '#2FA8A2',
    ghostBorder: 'rgba(255, 255, 255, 0.22)',
    onGlass: '#FFFFFF',
    shadow: '#000000'
  }
} as const;

/**
 * The Home banner, by time of day. One surface, four states -- the page never
 * changes, only this card does. Night is the only dark surface in light mode.
 *
 * These sit outside `COLORS` on purpose. `ThemeColor` is the set of keys a
 * component may pass to `AppText` or `Icon`, and a list of stops is not a
 * colour. `ink` travels with the stops because the pair is what stays readable.
 *
 * The axis approximates the 118deg of `.design/tokens.css`.
 */
export const BannerGradients = {
  dawn: { colors: ['#FFF7E6', '#FFECC6', '#FFDDA2'], ink: '#2B1F0C' },
  day: { colors: ['#FFFCF3', '#FFF3D6', '#FFE6B6'], ink: '#2B1F0C' },
  dusk: { colors: ['#FFEBCE', '#FFCE9A', '#F0A272'], ink: '#40200A' },
  night: { colors: ['#241F3E', '#322A57', '#453564'], ink: '#F4F1FC' }
} as const;

// The stops sit at these offsets, and the axis runs corner to corner -- the
// 118deg of `.design/tokens.css`, in the 0-1 space `react-native-svg` uses.
export const BannerGradientOffsets = ['0', '0.46', '1'] as const;
export const BannerGradientAxis = { x1: '0', y1: '0.15', x2: '1', y2: '0.85' } as const;

export type DayPart = keyof typeof BannerGradients;

/** Alias kept for existing imports */
export const Colors = COLORS;

export type ThemeMode = keyof typeof COLORS;
export type ThemeColor = keyof typeof COLORS.light & keyof typeof COLORS.dark;
export type ThemeColors = (typeof COLORS)[ThemeMode];

/** Resolved theme passed to components and `makeStyles` factories. */
export type AppTheme = {
  colors: ThemeColors;
  isDark: boolean;
  spacing: typeof Spacing;
};

/**
 * The families the `expo-font` config plugin embeds -- see app.config.ts.
 *
 * iOS resolves a family by its PostScript name (`Inter-Regular`), every other
 * platform by the file name (`Inter_400Regular`). They differ, so both are
 * listed rather than one being assumed to work everywhere.
 */
export const InterFontFamily = Platform.select({
  ios: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    extraBold: 'Inter-ExtraBold',
    black: 'Inter-Black'
  },
  default: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
    black: 'Inter_900Black'
  }
})!;

/** Gabarito carries headings. A warm geometric, not an editorial serif. */
export const GabaritoFontFamily = Platform.select({
  ios: {
    semiBold: 'Gabarito-SemiBold',
    bold: 'Gabarito-Bold'
  },
  default: {
    semiBold: 'Gabarito_600SemiBold',
    bold: 'Gabarito_700Bold'
  }
})!;

export type InterFontFamilyWeight = keyof typeof InterFontFamily;

export const Fonts = Platform.select({
  web: {
    sans: 'Inter, var(--font-display)',
    regular: 'Inter, var(--font-display)',
    medium: 'Inter, var(--font-display)',
    semiBold: 'Inter, var(--font-display)',
    bold: 'Inter, var(--font-display)',
    extraBold: 'Inter, var(--font-display)',
    black: 'Inter, var(--font-display)',
    heading: 'Gabarito, var(--font-display)',
    headingBold: 'Gabarito, var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)'
  },
  default: {
    sans: InterFontFamily.regular,
    regular: InterFontFamily.regular,
    medium: InterFontFamily.medium,
    semiBold: InterFontFamily.semiBold,
    bold: InterFontFamily.bold,
    extraBold: InterFontFamily.extraBold,
    black: InterFontFamily.black,
    heading: GabaritoFontFamily.semiBold,
    headingBold: GabaritoFontFamily.bold,
    serif: 'serif',
    rounded: InterFontFamily.regular,
    mono: 'monospace'
  }
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64
} as const;

export const Radius = {
  tile: 12,
  card: 24,
  banner: 28,
  full: 100
} as const;

/**
 * Height the bottom tab bar occupies, safe area included.
 *
 * Measured off the running iOS 26 tab bar (its reported frame is 0.095 of an
 * 868pt screen), not guessed -- expo-router's native tabs expose no hook for
 * this, so anything floating above the bar depends on this number being right.
 */
export const BottomTabInset = Platform.select({ ios: 84, android: 80 }) ?? 0;

/**
 * The style every `Stack.Title` takes.
 *
 * It cannot be a shared header component: `Stack.Screen` reads its direct
 * children only, so a `Stack.Title` returned by a wrapper component never
 * reaches the bar, which falls back to the route name. A constant can be
 * shared; the components cannot.
 */
export const HeaderTitleStyle = { fontSize: 18, fontWeight: 'bold' } as const;

/**
 * The gutter between screen content and the screen edge.
 *
 * Applied by ScreenScrollView on the *content container*, never on the frame --
 * padding on the frame insets the scroll view itself, which pulls the scroll
 * indicator off the edge and makes full-bleed content impossible. Exported so a
 * deliberately full-bleed child can re-indent its own text back to this line.
 */
export const ScreenGutter = Spacing.four;
export const MaxContentWidth = 800;

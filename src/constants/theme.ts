import '@/global.css';

import { Platform } from 'react-native';

export const COLORS = {
  light: {
    text: '#1C1815',
    background: '#FBFAF8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1EFEC',
    backgroundSheet: '#FFFFFF',
    backgroundSheetRow: '#F1EFEC',
    // A Post is full-bleed, so the band between two is all that separates them.
    postSurface: '#FFFFFF',
    postDivider: '#FBFAF8',
    textSecondary: '#746A60',
    border: 'rgba(58, 48, 38, 0.13)',
    error: '#CE3C39',
    // White on red: 4.9:1 here, 3.6:1 in dark. `onPrimary` is only 3.4:1 on it.
    onError: '#FFFFFF',
    errorMuted: 'rgba(206, 60, 57, 0.11)',
    // White on `success`: 6.6:1 here; the dark teal is too light for white, so it inverts.
    onSuccess: '#FFFFFF',
    like: '#E0405E',
    // A fill, never text: #F0A81C on white is 2.0:1.
    primary: '#F0A81C',
    primaryMuted: 'rgba(240, 168, 28, 0.14)',
    // A gold label. Clears 4.5:1 where `primary` cannot -- 5.8:1 on white.
    primaryText: '#8F5A03',
    onPrimary: '#2A1D06',
    success: '#10696B',
    successMuted: 'rgba(16, 105, 107, 0.12)',
    // A Reminder's Kind. On trial: gold is the fallback if they read as noise.
    medication: '#7A5C86',
    medicationMuted: 'rgba(122, 92, 134, 0.14)',
    vet: '#4B6A8C',
    vetMuted: 'rgba(75, 106, 140, 0.14)',
    // The dashed "Other" row and the "Add a pet" ghost row.
    ghostBorder: 'rgba(58, 48, 38, 0.20)',
    // Cannot be `text`: over an arbitrary photo a near-black glyph vanishes.
    onGlass: '#FFFFFF',
    shadow: '#4A3A26'
  },
  dark: {
    text: '#FBF7F2',
    background: '#111011',
    backgroundElement: '#1C1B1C',
    backgroundSelected: '#282728',
    backgroundSheet: '#191819',
    backgroundSheetRow: '#282728',
    // A Post on anything but black loses the photo's own black.
    postSurface: '#000000',
    postDivider: '#1C1B1C',
    textSecondary: '#A99C90',
    border: 'rgba(255, 255, 255, 0.14)',
    error: '#E05B58',
    onError: '#FFFFFF',
    errorMuted: 'rgba(224, 91, 88, 0.16)',
    onSuccess: '#0B2726',
    like: '#FF4D6D',
    primary: '#F5B435',
    primaryMuted: 'rgba(245, 180, 53, 0.20)',
    // Gold reads as text on a dark ground, so the two collapse. Keep both keys:
    // call sites must not know which mode they are in.
    primaryText: '#F5B435',
    onPrimary: '#2A1D06',
    success: '#2FA8A2',
    successMuted: 'rgba(47, 168, 162, 0.18)',
    medication: '#B49CC0',
    medicationMuted: 'rgba(180, 156, 192, 0.20)',
    vet: '#8FB0D2',
    vetMuted: 'rgba(143, 176, 210, 0.20)',
    ghostBorder: 'rgba(255, 255, 255, 0.22)',
    onGlass: '#FFFFFF',
    shadow: '#000000'
  }
} as const;

// Outside `COLORS` on purpose: `ThemeColor` is the set of keys a component may
// pass to `AppText` or `Icon`, and a list of stops is not a colour. `ink`
// travels with the stops because the pair is what stays readable.
export const BannerGradients = {
  dawn: { colors: ['#FFF7E6', '#FFECC6', '#FFDDA2'], ink: '#2B1F0C' },
  day: { colors: ['#FFFCF3', '#FFF3D6', '#FFE6B6'], ink: '#2B1F0C' },
  dusk: { colors: ['#FFEBCE', '#FFCE9A', '#F0A272'], ink: '#40200A' },
  night: { colors: ['#241F3E', '#322A57', '#453564'], ink: '#F4F1FC' }
} as const;

export const BannerGradientLocations = [0, 0.46, 1] as const;
export const BannerGradientStart = { x: 0, y: 0.15 } as const;
export const BannerGradientEnd = { x: 1, y: 0.85 } as const;

export type DayPart = keyof typeof BannerGradients;

// One surface in both modes: the native splash colour is baked at build time
// and cannot follow the theme. `field` must equal `backgroundColor` in the
// expo-splash-screen plugin options in app.config.ts.
export const SplashPalette = {
  field: '#F0A81C',
  crumpet: '#FBEED2',
  crumpetHole: '#E2A02A'
} as const;

export type ThemeMode = keyof typeof COLORS;
export type ThemeColor = keyof typeof COLORS.light & keyof typeof COLORS.dark;
export type ThemeColors = (typeof COLORS)[ThemeMode];

export type AppTheme = {
  colors: ThemeColors;
  isDark: boolean;
  spacing: typeof Spacing;
};

// iOS resolves a family by its PostScript name (`Inter-Regular`), every other
// platform by the file name (`Inter_400Regular`), so both are listed.
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

// Fixed in both modes: each sits on a photo or on a coloured fill, never on the page.
export const OverlayColors = {
  media: '#000000',
  onMedia: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.35)',
  fillSubtle: 'rgba(255, 255, 255, 0.18)',
  fillStrong: 'rgba(255, 255, 255, 0.35)'
} as const;

export const TypeScale = {
  caption2: 11,
  caption: 12,
  footnote: 13,
  subhead: 14,
  callout: 15,
  body: 16,
  headline: 17,
  title3: 18,
  title2: 22,
  title1: 28,
  largeTitle: 34
} as const;

export type TextSize = keyof typeof TypeScale;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64
} as const;

// An icon is sized by its role. See docs/conventions/icons.md.
export const IconSize = {
  inline: 16,
  control: 18,
  action: 20,
  header: 24,
  feature: 28
} as const;

export const Radius = {
  input: 8,
  control: 10,
  tile: 12,
  panel: 14,
  row: 18,
  card: 24,
  banner: 28,
  full: 100
} as const;

// Uncapped, iOS scales text about 3x at the top accessibility size, which no layout here holds.
export const MaxFontScale = { body: 1.5, header: 1.2 } as const;

// Measured off the running iOS 26 tab bar, not guessed: expo-router's native
// tabs expose no hook for the height, and anything floating above the bar
// depends on this number.
export const BottomTabInset = Platform.select({ ios: 84, android: 80 }) ?? 0;

// Cannot be a shared component: `Stack.Screen` reads direct children only, so a
// `Stack.Title` returned by a wrapper never reaches the bar.
export const HeaderTitleStyle = { fontSize: 18, fontWeight: 'bold' } as const;

export const LargeHeaderTitleStyle = { fontFamily: GabaritoFontFamily.bold, fontSize: 32 } as const;

// Applied on the content container, never the frame: padding on the frame
// insets the scroll view, which pulls the indicator off the edge.
export const ScreenGutter = Spacing.four;

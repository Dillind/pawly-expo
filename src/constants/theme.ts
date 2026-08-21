/**
 * Theme tokens for light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const COLORS = {
  light: {
    text: '#000000',
    // Light mode is a grouped-list field, not a white page: cards are white and
    // the page behind them is tinted. On a white page a white card has only its
    // shadow to separate it, and at our shadow weight that reads as nothing.
    background: '#F1F2F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4E6EB',
    backgroundSheet: '#FFFFFF',
    backgroundSheetRow: '#F1F2F5',
    textSecondary: '#60646C',
    // Separators, matched to UIColor.separator. A fill token used as a line
    // (backgroundSelected) is too close to white to read as one.
    border: 'rgba(60, 60, 67, 0.29)',
    error: '#CE3C39',
    like: '#E0405E',
    primary: '#0F7173',
    primaryMuted: 'rgba(15, 113, 115, 0.15)',
    onPrimary: '#ffffff',
    accent: '#6E44FF',
    shadow: '#0B0D12'
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    backgroundSheet: '#1C1D20',
    backgroundSheetRow: '#2E3135',
    textSecondary: '#B0B4BA',
    border: 'rgba(84, 84, 88, 0.60)',
    error: '#CE3C39',
    like: '#FF4D6D',
    primary: '#14A8AF',
    primaryMuted: 'rgba(20, 168, 175, 0.22)',
    onPrimary: '#ffffff',
    accent: '#6E44FF',
    shadow: '#000000'
  }
} as const;

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
  /** Icon tiles: squircle -- clearly neither circle nor square. */
  tile: 12,
  /** Cards and the action popover bubble. */
  card: 24,
  /** Fully round; used for circular tap targets. */
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
 * children only, so a `Stack.Title` inside a wrapper never registers and the
 * bar falls back to the route name. A constant is what can be shared.
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

/**
 * Theme tokens for light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const COLORS = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    error: '#CE3C39',
    primary: '#0F7173',
    primaryMuted: 'rgba(15, 113, 115, 0.15)',
    onPrimary: '#ffffff',
    accent: '#6E44FF'
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    error: '#CE3C39',
    primary: '#14A8AF',
    primaryMuted: 'rgba(20, 168, 175, 0.22)',
    onPrimary: '#ffffff',
    accent: '#6E44FF'
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

/**
 * Inter font family names registered via the expo-font plugin in app.config.ts.
 */
export const InterFontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black'
} as const;

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
export const MaxContentWidth = 800;

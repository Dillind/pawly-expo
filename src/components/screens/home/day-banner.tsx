import AppText from '@/components/core/app-text';
import BannerSun from '@/components/screens/home/banner-sun';
import {
  BannerGradientEnd,
  BannerGradientLocations,
  BannerGradientStart,
  BannerGradients,
  Radius,
  type AppTheme
} from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { dayPartInTimezone, greetingInTimezone } from '@/utils/day-part';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { useEffect } from 'react';

const BREATHE_MS = 2000;

type Props = {
  name: string;
  /** One line saying what is left. The banner does not work it out itself. */
  status: string;
  timezone: string;
};

/**
 * The Home banner: one gradient card that follows the household's clock.
 *
 * The state comes from the household timezone, not the device. A member in
 * another country otherwise gets a night banner over a household's morning.
 */
const DayBanner = ({ name, status, timezone }: Props) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  const part = dayPartInTimezone(timezone);
  const greeting = greetingInTimezone(timezone);
  const { colors, ink } = BannerGradients[part];

  const isReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isReducedMotion) {
      scale.value = 1;

      return;
    }

    scale.value = withRepeat(
      withTiming(1.03, { duration: BREATHE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [isReducedMotion, scale]);

  const sunStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <LinearGradient
      colors={colors}
      locations={BannerGradientLocations}
      start={BannerGradientStart}
      end={BannerGradientEnd}
      style={[styles.card, createShadowMedium(theme.colors)]}>
      <View style={styles.copy}>
        <AppText
          variant="header"
          size={27}
          fontWeight="bold"
          style={[styles.greeting, { color: ink }]}>
          {greeting}, {name}
        </AppText>
        {/* Keyed on the text so the line cross-fades when the count changes,
            rather than swapping a word under the reader. */}
        <Animated.View key={status} entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
          <AppText size={15} style={{ color: ink, opacity: 0.78 }}>
            {status}
          </AppText>
        </Animated.View>
      </View>
      <Animated.View style={sunStyle}>
        <BannerSun part={part} />
      </Animated.View>
    </LinearGradient>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      borderRadius: Radius.card,
      paddingHorizontal: spacing.three + spacing.one,
      paddingVertical: spacing.three,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      overflow: 'hidden'
    },
    copy: {
      flex: 1,
      gap: spacing.one + spacing.half
    },
    greeting: {
      letterSpacing: -0.5
    }
  });

export default DayBanner;

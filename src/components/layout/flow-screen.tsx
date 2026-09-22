import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import ScreenFooter from '@/components/layout/screen-footer';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { Radius, ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const PROGRESS_DURATION_MS = 520;

type Props = {
  step: number;
  stepCount: number;
  title: string;
  subtitle?: string;
  closeLabel: string;
  onClose: () => void;
  onBack?: () => void;
  // Sits beside the close button, for a flow that needs one more bar control.
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  isKeyboardAware?: boolean;
};

// The chrome three flows share: a full-height push, a linear bar, a close
// button that is not a back arrow, and a footer outside the scroll view.
const FlowScreen = ({
  step,
  stepCount,
  title,
  subtitle,
  closeLabel,
  onClose,
  onBack,
  action,
  footer,
  children,
  isKeyboardAware = false
}: Props) => {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const progress = useSharedValue(step / stepCount);
  const progressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));

  useEffect(() => {
    progress.set(withTiming(step / stepCount, { duration: PROGRESS_DURATION_MS }));
  }, [progress, step, stepCount]);

  return (
    <ScreenView edges={[]}>
      <View style={[styles.nav, { paddingTop: Math.max(insets.top, Spacing.three) }]}>
        {onBack ? (
          <IconButton
            name="caretLeft"
            accessibilityLabel="Go back a step"
            variant="glass"
            size={22}
            strokeWidth={2}
            onPress={onBack}
          />
        ) : (
          <View style={styles.navSpacer} />
        )}

        <View style={styles.navRight}>
          {action}
          <IconButton
            name="close"
            accessibilityLabel={closeLabel}
            variant="glass"
            size={22}
            strokeWidth={2}
            onPress={onClose}
          />
        </View>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${stepCount}`}>
        <Animated.View style={[styles.progress, progressStyle]} />
      </View>

      <View style={styles.head}>
        <AppText size="footnote" color="textSecondary">
          Step {step} of {stepCount}
        </AppText>
        <AppText variant="header" size="title1" fontWeight="bold" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText size="subhead" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <ScreenScrollView
        keyboardShouldPersistTaps="handled"
        // A step can be shorter than the keyboard, so there is nothing to
        // scroll and no tap outside dismisses it. A drag is the way out.
        keyboardDismissMode="on-drag"
        isKeyboardAware={isKeyboardAware}
        contentContainerStyle={styles.content}>
        {children}
      </ScreenScrollView>

      {footer ? <ScreenFooter>{footer}</ScreenFooter> : null}
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.three,
      paddingBottom: spacing.half
    },
    navRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    navSpacer: {
      width: 44,
      height: 44
    },
    track: {
      height: 3,
      marginHorizontal: ScreenGutter,
      borderRadius: Radius.full,
      backgroundColor: colors.border,
      overflow: 'hidden'
    },
    // Scaled, not resized, so the bar composites instead of laying out. The
    // origin has to be left or it grows from the middle in both directions.
    progress: {
      height: 3,
      width: '100%',
      transformOrigin: 'left',
      borderRadius: Radius.full,
      backgroundColor: colors.primary
    },
    head: {
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.four - spacing.one
    },
    title: {
      marginTop: spacing.one + 1
    },
    subtitle: {
      marginTop: spacing.two
    },
    content: {
      gap: spacing.four - spacing.one,
      paddingBottom: spacing.five
    }
  });

export default FlowScreen;

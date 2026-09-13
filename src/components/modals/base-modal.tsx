import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
import { useReducedMotion } from 'react-native-reanimated';

import AppText from '@/components/core/app-text';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const ANIMATION_MS = 280;
const BACKDROP_OPACITY = 0.55;

type Props = {
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  // `card` is a themed panel; `bare` leaves the surface to the caller.
  variant?: 'card' | 'bare';
  isBackdropDismissible?: boolean;
  // Leave off when the content scrolls: the gestures fight.
  isSwipeDismissible?: boolean;
  hasAnimation?: boolean;
  onDismissed?: () => void;
};

// The only place `react-native-modal` is imported. Reach for BaseSheet first:
// this is for a centred panel, or a surface that animates its own frame.
const BaseModal = ({
  isVisible,
  onClose,
  children,
  title,
  variant = 'card',
  isBackdropDismissible = true,
  isSwipeDismissible = false,
  hasAnimation = true,
  onDismissed
}: Props) => {
  const styles = useStyles(makeStyles);
  const isReducedMotion = useReducedMotion();

  const backdropTiming = isReducedMotion ? 0 : ANIMATION_MS;
  const timing = hasAnimation ? backdropTiming : 0;

  return (
    <Modal
      isVisible={isVisible}
      style={[styles.modal, variant === 'card' && styles.centred]}
      backdropColor="#000000"
      backdropOpacity={BACKDROP_OPACITY}
      animationIn={hasAnimation ? 'fadeInUp' : 'fadeIn'}
      animationOut={hasAnimation ? 'fadeOutDown' : 'fadeOut'}
      animationInTiming={timing}
      animationOutTiming={timing}
      // Must exist for onBackdropPress to fire, and fades even when the content
      // does not, so it never snaps in behind a caller's own animation.
      backdropTransitionInTiming={backdropTiming}
      backdropTransitionOutTiming={backdropTiming}
      useNativeDriver
      useNativeDriverForBackdrop
      statusBarTranslucent
      avoidKeyboard
      swipeDirection={isSwipeDismissible ? 'down' : undefined}
      onSwipeComplete={isSwipeDismissible ? onClose : undefined}
      onBackdropPress={isBackdropDismissible ? onClose : undefined}
      onBackButtonPress={isBackdropDismissible ? onClose : undefined}
      onModalHide={onDismissed}>
      {variant === 'bare' ? (
        children
      ) : (
        <View style={styles.card}>
          {title && (
            <AppText variant="header" size={20}>
              {title}
            </AppText>
          )}
          {children}
        </View>
      )}
    </Modal>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    modal: {
      margin: 0
    },
    centred: {
      justifyContent: 'center',
      padding: spacing.four
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      padding: spacing.four,
      gap: spacing.three
    }
  });

export default BaseModal;

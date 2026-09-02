import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

const POINTS: { icon: IconName; title: string; detail: string }[] = [
  {
    icon: 'clock',
    title: 'A feed is a time you plan to feed your pet',
    detail: 'Morning at 7, dinner at 6. Set as many as you need.'
  },
  {
    icon: 'check',
    title: 'Tap Log when you feed them',
    detail: 'Everyone sees it straight away, so nobody feeds twice.'
  },
  {
    icon: 'clock',
    title: 'Late is fine',
    detail: 'Log dinner at 8 and it is still dinner, just logged late.'
  },
  {
    icon: 'bell',
    title: 'Not logged means nobody tapped Log',
    detail: 'It does not mean your pet went hungry. Log it whenever you remember.'
  }
];

/**
 * Reachable, never a gate. Nothing in the app waits on someone reading this,
 * which is why it is a sheet raised from the pet screen rather than a tour.
 */
const HowFeedsWorkSheet = ({ sheetRef }: { sheetRef: RefObject<TrueSheet | null> }) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet sheetRef={sheetRef} title="How feeds work" detents={['auto']}>
      <View style={styles.points}>
        {POINTS.map((point) => (
          <View key={point.title} style={styles.point}>
            <Icon name={point.icon} size={20} color="text" />
            <View style={styles.text}>
              <AppText size={15} fontWeight="bold">
                {point.title}
              </AppText>
              <AppText size={14} color="textSecondary">
                {point.detail}
              </AppText>
            </View>
          </View>
        ))}

        <MainButton text="Got it" onPress={() => void sheetRef.current?.dismiss()} />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    points: {
      gap: spacing.four
    },
    point: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.three
    },
    text: {
      flex: 1,
      gap: 2
    }
  });

export default HowFeedsWorkSheet;

import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import { IconSize, OverlayColors, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  title: string;
  lead: string;
  body: string;
};

// Real copy, no purchase button: RevenueCat is not installed yet. The sheet
// exists so the free line is seen at the door, which is where Hevy shows it.
const ProSheet = ({ sheetRef, title, lead, body }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']}>
      <View style={styles.panel}>
        <View style={styles.glyph}>
          <Icon name="luggage" size={140} color="onPrimary" strokeWidth={1.2} />
        </View>

        <View style={styles.panelHeader}>
          <View style={styles.badge}>
            <AppText size="caption" fontWeight="bold" color="onPrimary">
              Crumpet Pro
            </AppText>
          </View>
          <IconButton
            name="close"
            accessibilityLabel="Close"
            variant="ghost"
            color="onPrimary"
            size={IconSize.control}
            containerStyle={styles.close}
            onPress={() => void sheetRef.current?.dismiss()}
          />
        </View>

        <View style={styles.panelText}>
          <AppText variant="header" size={26} color="onPrimary">
            {title}
          </AppText>
          <AppText size="callout" color="onPrimary">
            {lead}
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <AppText size="callout" style={styles.bodyText}>
          {body}
        </AppText>
        <View style={styles.comingSoon} accessibilityRole="text">
          <AppText size="headline" fontWeight="bold" color="textSecondary">
            Coming soon
          </AppText>
        </View>
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    panel: {
      backgroundColor: colors.primary,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      padding: spacing.four,
      gap: spacing.five,
      overflow: 'hidden'
    },
    glyph: {
      position: 'absolute',
      right: -spacing.two - spacing.half,
      top: -spacing.one - spacing.half,
      opacity: 0.28
    },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    badge: {
      paddingVertical: spacing.one,
      paddingHorizontal: spacing.two + spacing.half,
      borderRadius: Radius.full,
      backgroundColor: OverlayColors.fillStrong
    },
    close: {
      backgroundColor: OverlayColors.fillSubtle
    },
    panelText: {
      gap: spacing.one
    },
    body: {
      gap: spacing.three,
      paddingTop: spacing.three
    },
    bodyText: {
      lineHeight: 22,
      paddingHorizontal: spacing.two
    },
    // Not a MainButton: nothing happens on press, so it must not look pressable.
    comingSoon: {
      height: 50,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    }
  });

export default ProSheet;

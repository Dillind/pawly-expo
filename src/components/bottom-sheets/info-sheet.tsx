import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

/** A paragraph, or a subheading introducing the paragraphs after it. */
export type InfoBlock = { kind: 'paragraph' | 'heading'; text: string };

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  glyph: IconName;
  title: string;
  subtitle: string;
  body: InfoBlock[];
};

const InfoSheet = ({ sheetRef, glyph, title, subtitle, body }: Props) => {
  const styles = useStyles(makeStyles);

  const dismiss = () => {
    void sheetRef.current?.dismiss();
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto', 0.9]} scrollable>
      <View style={styles.panel}>
        <View style={styles.glyph}>
          <Icon name={glyph} size={120} color="onPrimary" />
        </View>

        <View style={styles.panelHeader}>
          <IconButton
            name="close"
            accessibilityLabel="Close"
            variant="ghost"
            color="onPrimary"
            size={18}
            containerStyle={styles.closeButton}
            onPress={dismiss}
          />
        </View>

        <View style={styles.panelText}>
          <AppText variant="header" size={26} color="onPrimary">
            {title}
          </AppText>
          <AppText size={15} color="onPrimary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        {body.map((block, index) =>
          block.kind === 'heading' ? (
            <AppText key={index} variant="header" size={17}>
              {block.text}
            </AppText>
          ) : (
            <AppText key={index} size={15} color="textSecondary">
              {block.text}
            </AppText>
          )
        )}
      </View>

      <MainButton text="Got it" onPress={dismiss} />
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
    // Low opacity so the glyph reads as texture behind the title.
    glyph: {
      position: 'absolute',
      top: -24,
      left: -16,
      opacity: 0.14
    },
    panelHeader: {
      alignItems: 'flex-end'
    },
    closeButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)'
    },
    panelText: {
      gap: spacing.one
    },
    subtitle: {
      opacity: 0.85
    },
    body: {
      gap: spacing.three,
      paddingTop: spacing.one
    }
  });

export default InfoSheet;

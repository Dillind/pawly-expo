import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { TrueSheet, type SheetDetent } from '@lodev09/react-native-true-sheet';
import type { ReactNode, RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  children: ReactNode;
  title?: string;
  detents?: SheetDetent[];
  scrollable?: boolean;
  onDismiss?: () => void;
};

/**
 * The only file in the app that imports TrueSheet as a value (ADR 0010).
 * Everywhere else imports it as a type, for the ref.
 *
 * backgroundColor is handed to native code, so it is read from useTheme() on
 * every render. A module-scope colour constant produces a sheet that ignores
 * dark mode while the JS content inside it adapts — half the sheet themes
 * correctly, which is a particularly confusing bug to chase.
 *
 * Android caps at 3 detents, so the ['auto', 0.6, 1] default is already at the
 * platform limit.
 */
const BaseSheet = ({
  sheetRef,
  children,
  title,
  detents = ['auto', 0.6, 1],
  scrollable = false,
  onDismiss
}: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={detents}
      backgroundColor={theme.colors.background}
      cornerRadius={20}
      grabber={true}
      scrollable={scrollable}
      onDidDismiss={onDismiss}>
      <View style={styles.content}>
        {title && (
          <AppText variant="header" size={20}>
            {title}
          </AppText>
        )}
        {children}
      </View>
    </TrueSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      padding: spacing.four,
      paddingBottom: spacing.five,
      gap: spacing.three
    }
  });

export default BaseSheet;

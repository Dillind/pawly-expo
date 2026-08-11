import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import { Radius, type AppTheme } from '@/constants/theme';
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
  onPresent?: () => void;
};

const BaseSheet = ({
  sheetRef,
  children,
  title,
  detents = ['auto', 0.6, 1],
  scrollable = false,
  onDismiss,
  onPresent
}: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={detents}
      backgroundColor={theme.colors.backgroundSheet}
      grabber={true}
      scrollable={scrollable}
      onDidDismiss={onDismiss}
      onDidPresent={onPresent}>
      <View style={styles.content}>
        {title && (
          <>
            <View style={styles.header}>
              <AppText variant="header" size={22}>
                {title}
              </AppText>
              <IconButton
                name="close"
                accessibilityLabel="Close"
                variant="ghost"
                size={18}
                containerStyle={styles.close}
                onPress={() => void sheetRef.current?.dismiss()}
              />
            </View>

            <View style={styles.divider} />
          </>
        )}

        {children}
      </View>
    </TrueSheet>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    content: {
      padding: spacing.four,
      paddingBottom: spacing.five,
      gap: spacing.three
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    close: {
      backgroundColor: colors.backgroundSelected,
      borderRadius: Radius.full
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textSecondary,
      opacity: 0.3
    }
  });

export default BaseSheet;

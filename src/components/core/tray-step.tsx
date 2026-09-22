import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  title: string;
  header?: () => ReactNode;
  isFirst: boolean;
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
};

const TrayStep = ({ title, header, isFirst, onBack, onClose, children }: Props) => {
  const styles = useStyles(makeStyles);
  const { height } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          name={isFirst ? 'close' : 'caretLeft'}
          accessibilityLabel={isFirst ? 'Close' : 'Back'}
          variant="ghost"
          size={IconSize.action}
          onPress={isFirst ? onClose : onBack}
        />

        {header ? (
          <View style={styles.headerContent} accessibilityLabel={title}>
            {header()}
          </View>
        ) : (
          <AppText variant="header" size="title3">
            {title}
          </AppText>
        )}
      </View>

      {/* TrueSheet's scrollable does not support an auto detent, so the step bounds and scrolls itself. */}
      <ScrollView
        style={{ maxHeight: height * 0.7 }}
        contentContainerStyle={styles.body}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.three
    },
    body: {
      gap: spacing.three
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default TrayStep;

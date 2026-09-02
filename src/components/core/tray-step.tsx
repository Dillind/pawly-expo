import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          name={isFirst ? 'close' : 'caretLeft'}
          accessibilityLabel={isFirst ? 'Close' : 'Back'}
          variant="ghost"
          size={20}
          onPress={isFirst ? onClose : onBack}
        />

        {header ? (
          <View style={styles.headerContent} accessibilityLabel={title}>
            {header()}
          </View>
        ) : (
          <AppText variant="header" size={18}>
            {title}
          </AppText>
        )}
      </View>

      {children}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
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

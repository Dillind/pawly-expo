import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import { ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  /** "Post" when sharing, "Save" when editing. */
  confirmText: string;
  isConfirmDisabled?: boolean;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Both post routes are full-screen modals rather than stack screens, so neither
 * gets a native header and each has to draw its own.
 */
const PostModalHeader = ({
  title,
  confirmText,
  isConfirmDisabled = false,
  isBusy = false,
  onCancel,
  onConfirm
}: Props) => {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing.three) }]}>
      {/* alignSelf overrides MainButton's own `stretch`, which would otherwise
          pull both buttons to the full height of the header row. */}
      <MainButton
        text="Cancel"
        variant="glass"
        size="xs"
        containerStyle={styles.button}
        onPress={onCancel}
        isDisabled={isBusy}
      />

      <AppText size={16} fontWeight="bold">
        {title}
      </AppText>

      <MainButton
        text={confirmText}
        size="xs"
        containerStyle={styles.button}
        onPress={onConfirm}
        isLoading={isBusy}
        isDisabled={isConfirmDisabled}
      />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.three,
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.three,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    button: {
      alignSelf: 'center'
    }
  });

export default PostModalHeader;

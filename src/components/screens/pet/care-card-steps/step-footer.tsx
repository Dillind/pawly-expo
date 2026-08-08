import MainButton from '@/components/core/main-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** The first step has nowhere back, so Next takes the full width. */
  isFirst?: boolean;
  isBusy?: boolean;
  backLabel?: string;
  nextLabel?: string;
  nextIcon?: ReactElement;
  isNextDisabled?: boolean;
  onBack?: () => void;
  onNext: () => void;
};

const StepFooter = ({
  isFirst = false,
  isBusy = false,
  backLabel = 'Back',
  nextLabel = 'Next',
  nextIcon,
  isNextDisabled = false,
  onBack,
  onNext
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.footer}>
      {!isFirst && (
        <MainButton
          text={backLabel}
          variant="neutral"
          containerStyle={styles.button}
          isDisabled={isBusy}
          onPress={onBack}
        />
      )}
      <MainButton
        text={nextLabel}
        leftIcon={nextIcon}
        containerStyle={styles.button}
        isLoading={isBusy}
        isDisabled={isBusy || isNextDisabled}
        onPress={onNext}
      />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    footer: { flexDirection: 'row', gap: spacing.two },
    button: { flex: 1 }
  });

export default StepFooter;

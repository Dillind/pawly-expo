import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { isAndroid } from '@/utils/platform';
import { useEffect, useRef } from 'react';
import { useFormState } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';

type Props = {
  label?: string;
  name: string;
  value: string;
  onChangeText: (code: string) => void;
  onComplete?: (code: string) => void;
  codeLength?: number;
  autoFocus?: boolean;
  testID?: string;
};

/**
 * One box per digit, drawn over a single hidden TextInput.
 *
 * The boxes are not inputs. Six real fields would each need their own focus and
 * backspace handling, and iOS will only offer the emailed code above the
 * keyboard to a field long enough to hold the whole thing.
 */
const VerificationCodeInput = ({
  label,
  name,
  value,
  onChangeText,
  onComplete,
  codeLength = 6,
  autoFocus = true,
  testID
}: Props) => {
  const styles = useStyles(makeStyles);
  const inputRef = useRef<TextInput>(null);
  const { errors } = useFormState({ name });

  useEffect(() => {
    if (!autoFocus) return;

    // The sheet/screen transition steals focus if we ask for it immediately.
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, codeLength);

    onChangeText(digits);
    if (digits.length === codeLength) onComplete?.(digits);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <AppText size={16} fontWeight="bold">
          {label}
        </AppText>
      ) : null}

      <PressableOpacity
        style={styles.boxes}
        onPress={() => inputRef.current?.focus()}
        accessibilityLabel={label ?? 'Verification code'}>
        {Array.from({ length: codeLength }, (_, index) => {
          const digit = value[index] ?? '';
          const isNext = index === value.length && value.length < codeLength;

          return (
            <View
              key={index}
              style={[styles.box, digit ? styles.boxFilled : null, isNext ? styles.boxNext : null]}>
              <AppText size={22} align="center">
                {digit}
              </AppText>
            </View>
          );
        })}
      </PressableOpacity>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={isAndroid ? 'sms-otp' : 'one-time-code'}
        maxLength={codeLength}
        style={styles.hiddenInput}
        autoCorrect={false}
        caretHidden
        testID={testID}
      />

      <FieldError error={errors[name]?.message as string | undefined} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.two
    },
    boxes: {
      flexDirection: 'row',
      gap: spacing.two
    },
    box: {
      flex: 1,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement
    },
    boxFilled: {
      borderColor: colors.primary
    },
    boxNext: {
      borderWidth: 2,
      borderColor: colors.primary
    },
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      height: 0,
      width: 0
    }
  });

export default VerificationCodeInput;

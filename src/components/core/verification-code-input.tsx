import { useEffect, useRef } from 'react';
import { useFormState } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';

import AppText from '@/components/core/app-text';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { isAndroid } from '@/utils/platform';

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
  const hasCompleted = useRef(false);
  const { errors } = useFormState({ name });

  useEffect(() => {
    if (!autoFocus) return;

    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, codeLength);

    onChangeText(digits);

    if (digits.length < codeLength) {
      hasCompleted.current = false;
      return;
    }

    if (hasCompleted.current) return;
    hasCompleted.current = true;
    onComplete?.(digits);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <AppText size={16} fontWeight="bold">
          {label}
        </AppText>
      ) : null}

      <View>
        <View style={styles.boxes} pointerEvents="none" accessibilityElementsHidden>
          {Array.from({ length: codeLength }, (_, index) => {
            const digit = value[index] ?? '';
            const isNext = index === value.length && value.length < codeLength;

            return (
              <View
                key={index}
                style={[
                  styles.box,
                  digit ? styles.boxFilled : null,
                  isNext ? styles.boxNext : null
                ]}>
                <AppText size={22} align="center">
                  {digit}
                </AppText>
              </View>
            );
          })}
        </View>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={isAndroid ? 'sms-otp' : 'one-time-code'}
          maxLength={codeLength}
          style={styles.input}
          autoCorrect={false}
          caretHidden
          accessibilityLabel={label ?? 'Verification code'}
          accessibilityValue={{ text: value.split('').join(' ') }}
          testID={testID}
        />
      </View>

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
      borderColor: colors.primaryText
    },
    boxNext: {
      borderWidth: 2,
      borderColor: colors.primaryText
    },
    input: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      color: 'transparent',
      backgroundColor: 'transparent'
    }
  });

export default VerificationCodeInput;

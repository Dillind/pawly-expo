import PressableOpacity from '@/components/core/pressable-opacity';
import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import FieldError from '@/lib/form/components/field-error';
import { EyeIcon, EyeSlashIcon } from 'phosphor-react-native';
import React, { useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import {
  BlurEvent,
  FocusEvent,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  StyleProp,
  TextInput,
  View,
  ViewStyle
} from 'react-native';
import AppText from './app-text';
import IndicatedText from './indicated-text';

type Props = {
  placeholder?: string;
  value: string;
  onChangeText?: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  isEditable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  containerStyle?: StyleProp<ViewStyle>;
  secureTextEntry?: boolean;
  label?: string;
  marginTop?: number;
  marginBottom?: number;
  onPress?: () => void;
  suffix?: string;
  onBlur?: ((e: BlurEvent) => void) | undefined;
  onFocus?: ((e: FocusEvent) => void) | undefined;
  rightIcon?: React.ReactNode;
  isLabelIndicated?: boolean;
  leftIcon?: React.ReactNode;
  borderColor?: ThemeColor;
  name?: string;
  description?: string;
  height?: number;
  backgroundColor?: ThemeColor;
  returnKeyType?: ReturnKeyTypeOptions;
  maxLength?: number;
  showFieldError?: boolean;
};

const TextInputValidated = React.forwardRef<TextInput, Props>(
  (
    {
      name,
      placeholder,
      value,
      autoCapitalize = 'sentences',
      containerStyle,
      isEditable = true,
      keyboardType,
      onChangeText,
      secureTextEntry,
      label,
      marginTop,
      marginBottom,
      onPress,
      onBlur,
      onFocus,
      isLabelIndicated,
      leftIcon,
      description,
      height = 46,
      rightIcon,
      borderColor = 'textSecondary',
      backgroundColor = 'background',
      returnKeyType = 'done',
      maxLength,
      showFieldError = true
    },
    ref
  ) => {
    const theme = useTheme();
    const [isSecured, setIsSecured] = useState<boolean | undefined>(secureTextEntry);
    const form = useFormContext();
    const { errors } = useFormState({ control: form?.control, name });
    const styles = useThemedStyles(
      (colors) => ({
        textInputContainer: {
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors[borderColor],
          backgroundColor: colors[backgroundColor]
        },
        visibilityIcon: {
          paddingRight: 12,
          height: '100%',
          justifyContent: 'center'
        },
        textInput: {
          flex: 1,
          paddingHorizontal: 12,
          fontSize: 14,
          fontWeight: 'normal',
          color: colors.text,
          paddingVertical: 0,
          height: '100%'
        }
      }),
      [borderColor, backgroundColor]
    );

    return (
      <View style={[containerStyle, { marginBottom, marginTop }]}>
        {label &&
          (isLabelIndicated ? (
            <IndicatedText text={label} marginBottom={description ? 0 : 4} textColor="text" />
          ) : (
            <AppText color="text" size={16} style={{ marginBottom: description ? 0 : 4 }}>
              {label}
            </AppText>
          ))}
        {description && (
          <AppText size={14} style={{ marginBottom: 4 }} color="textSecondary">
            {description}
          </AppText>
        )}
        <View style={[styles.textInputContainer, { height }]}>
          {leftIcon && leftIcon}
          <TextInput
            ref={ref}
            onBlur={onBlur}
            onPress={onPress}
            onFocus={onFocus}
            secureTextEntry={isSecured}
            editable={isEditable}
            autoComplete="off"
            textContentType={secureTextEntry ? 'oneTimeCode' : undefined}
            autoCorrect={false}
            autoCapitalize={autoCapitalize}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            keyboardType={keyboardType}
            style={styles.textInput}
            importantForAutofill="yes"
            value={value}
            onChangeText={onChangeText}
            returnKeyType={returnKeyType}
            maxLength={maxLength}
          />
          {rightIcon && rightIcon}
          {secureTextEntry && (
            <PressableOpacity
              onPress={() => setIsSecured(!isSecured)}
              style={styles.visibilityIcon}>
              {isSecured ? (
                <EyeSlashIcon size={16} color={theme.text} />
              ) : (
                <EyeIcon size={16} color={theme.text} />
              )}
            </PressableOpacity>
          )}
        </View>
        {name && showFieldError && (
          <FieldError marginTop={8} error={errors?.[name]?.message as string} />
        )}
      </View>
    );
  }
);

TextInputValidated.displayName = 'TextInputValidated';

export default TextInputValidated;

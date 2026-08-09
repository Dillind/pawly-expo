import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IndicatedText from '@/components/core/indicated-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme, ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import CharacterCount from '@/lib/form/components/character-count';
import FieldError from '@/lib/form/components/field-error';
import React, { useCallback, useState } from 'react';
import { useFormContext, useFormState, type Control, type FieldValues } from 'react-hook-form';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  ViewStyle
} from 'react-native';

export type TextInputRef = React.ElementRef<typeof TextInput>;

type Props = Pick<
  TextInputProps,
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'testID'
  | 'maxLength'
  | 'autoFocus'
> & {
  value: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  isEditable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
  marginTop?: number;
  marginBottom?: number;
  onPress?: () => void;
  suffix?: string;
  rightIcon?: React.ReactNode;
  isLabelIndicated?: boolean;
  leftIcon?: React.ReactNode;
  borderColor?: ThemeColor;
  name?: string;
  description?: string;
  height?: number;
  backgroundColor?: ThemeColor;
  showFieldError?: boolean;
  isMultiline?: boolean;
  /** Renders "12/500" beneath the field. Needs `maxLength` to mean anything. */
  showCharacterCount?: boolean;
};

const TextInputValidated = React.forwardRef<TextInputRef, Props>(
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
      showFieldError = true,
      autoComplete,
      testID,
      onSubmitEditing,
      autoFocus,
      autoCorrect = false,
      isMultiline = false,
      showCharacterCount = false
    },
    ref
  ) => {
    const [isSecured, setIsSecured] = useState<boolean | undefined>(secureTextEntry);

    const theme = useTheme();
    const form = useFormContext();

    const makeThemedStyles = useCallback(
      (currentTheme: AppTheme) => makeStyles(currentTheme, borderColor, backgroundColor),
      [borderColor, backgroundColor]
    );
    const styles = useStyles(makeThemedStyles);

    const input = (
      <View style={styles.inputHost}>
        <TextInput
          ref={ref}
          defaultValue={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          onFocus={onFocus}
          secureTextEntry={isSecured}
          editable={isEditable}
          autoComplete={autoComplete ?? (secureTextEntry ? 'password' : 'off')}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
          testID={testID}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          multiline={isMultiline}
          style={[
            styles.textInput,
            styles.textInputText,
            isMultiline && styles.textInputMultiline,
            { color: theme.colors.text }
          ]}
        />
      </View>
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
        <View
          style={[styles.textInputContainer, isMultiline && styles.multilineContainer, { height }]}>
          {leftIcon && leftIcon}
          {onPress ? <PressableOpacity onPress={onPress}>{input}</PressableOpacity> : input}
          {rightIcon && rightIcon}
          {secureTextEntry && (
            <PressableOpacity
              onPress={() => setIsSecured(!isSecured)}
              style={styles.visibilityIcon}>
              {isSecured ? <Icon name="eyeOff" size={16} /> : <Icon name="eye" size={16} />}
            </PressableOpacity>
          )}
        </View>
        {showCharacterCount && maxLength !== undefined && (
          <CharacterCount value={value} max={maxLength} />
        )}
        {form && name && showFieldError && <SubscribedFieldError control={form.control} name={name} />}
      </View>
    );
  }
);

const SubscribedFieldError = ({
  control,
  name
}: {
  control: Control<FieldValues>;
  name: string;
}) => {
  const { errors } = useFormState({ control, name });

  return <FieldError marginTop={8} error={errors?.[name]?.message as string} />;
};

const makeStyles = ({ colors }: AppTheme, borderColor: ThemeColor, backgroundColor: ThemeColor) =>
  StyleSheet.create({
    textInputContainer: {
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors[borderColor],
      backgroundColor: colors[backgroundColor]
    },
    // A multiline box is sized by `height`, so the text has to start at the
    // top of it rather than sit vertically centred like a single-line field.
    multilineContainer: {
      alignItems: 'flex-start'
    },
    textInputMultiline: {
      paddingVertical: 12,
      textAlignVertical: 'top'
    },
    visibilityIcon: {
      paddingRight: 12,
      height: '100%',
      justifyContent: 'center'
    },
    inputHost: {
      flex: 1,
      alignSelf: 'stretch',
      minHeight: 44
    },
    textInput: {
      flex: 1,
      paddingHorizontal: 12,
      width: '100%',
      minHeight: 44,
      height: '100%'
    },
    textInputText: {
      fontSize: 14,
      fontWeight: 'normal'
    }
  });

TextInputValidated.displayName = 'TextInputValidated';

export default TextInputValidated;

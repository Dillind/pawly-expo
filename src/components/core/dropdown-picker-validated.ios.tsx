import AppText from '@/components/core/app-text';
import IndicatedText from '@/components/core/indicated-text';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useFormContext } from 'react-hook-form';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  items: string[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  label?: string;
  placeholder?: string;
  isLabelIndicated?: boolean;
  getText?: (item: string) => string;
  description?: string;
  name?: string;
  /** Accepted for parity with the fallback; SwiftUI places the menu itself. */
  dropdownPosition?: 'auto' | 'top' | 'bottom';
  wrapperStyle?: StyleProp<ViewStyle>;
  showFieldError?: boolean;
};

/**
 * iOS uses a real SwiftUI menu picker. The JS dropdown it replaces drew an
 * absolutely positioned list inside the React tree, so inside a sheet it was
 * clipped by the sheet instead of floating over it. A native menu is presented
 * by UIKit in its own window and has no such problem.
 */
const DropdownPickerValidated = ({
  placeholder,
  isDisabled,
  marginBottom,
  marginTop,
  items,
  onChange,
  value,
  isLabelIndicated,
  label,
  getText,
  description,
  name,
  wrapperStyle,
  showFieldError = true
}: Props) => {
  const form = useFormContext();
  const errors = form?.formState?.errors;
  const styles = useStyles(makeStyles);

  const selectedText = value ? (getText ? getText(value) : value) : (placeholder ?? 'Select');

  return (
    <View style={[wrapperStyle, { marginBottom, marginTop }]}>
      {label &&
        (isLabelIndicated ? (
          <IndicatedText text={label} marginBottom={description ? 0 : 8} />
        ) : (
          <AppText color="text" size={16} style={styles.label} fontWeight="bold">
            {label}
          </AppText>
        ))}

      {description && (
        <AppText size={16} style={styles.label} fontWeight="regular" color="textSecondary">
          {description}
        </AppText>
      )}

      <View style={[styles.field, isDisabled && styles.fieldDisabled]}>
        <Host matchContents>
          <Picker
            modifiers={[pickerStyle('menu')]}
            label={selectedText}
            selection={value}
            onSelectionChange={(selection) => {
              if (!isDisabled) onChange(selection);
            }}>
            {items.map((item) => (
              <Text key={item} modifiers={[tag(item)]}>
                {getText ? getText(item) : item}
              </Text>
            ))}
          </Picker>
        </Host>
      </View>

      {name && showFieldError && (
        <FieldError marginTop={8} error={errors?.[name]?.message as string} />
      )}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    label: { marginBottom: spacing.two },
    field: {
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: spacing.three,
      borderWidth: 1,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      borderColor: colors.textSecondary,
      backgroundColor: colors.backgroundElement
    },
    fieldDisabled: { opacity: 0.5 }
  });

export default DropdownPickerValidated;

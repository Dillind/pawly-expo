import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { useFormContext } from 'react-hook-form';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import IndicatedText from './indicated-text';

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
  dropdownPosition?: 'auto' | 'top' | 'bottom';
  wrapperStyle?: StyleProp<ViewStyle>;
  showFieldError?: boolean;
};

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
  dropdownPosition,
  wrapperStyle,
  showFieldError = true
}: Props) => {
  const form = useFormContext();
  const errors = form?.formState?.errors;
  const styles = useStyles(makeStyles);

  return (
    <View style={[wrapperStyle, { marginBottom, marginTop }]}>
      {label &&
        (isLabelIndicated ? (
          <IndicatedText text={label} marginBottom={description ? 0 : 8} />
        ) : (
          <AppText
            color="text"
            size={16}
            style={{ marginBottom: description ? 0 : 8 }}
            fontWeight="bold">
            {label}
          </AppText>
        ))}
      {description && (
        <AppText size={16} style={{ marginBottom: 8 }} fontWeight="regular" color="textSecondary">
          {description}
        </AppText>
      )}
      <Dropdown
        dropdownPosition={dropdownPosition}
        disable={isDisabled}
        style={styles.dropdown}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        containerStyle={styles.dropdownContainer}
        renderRightIcon={() => <Icon name="caretDown" size={16} />}
        data={items.map((item) => ({
          label: getText ? getText(item) : item,
          value: item
        }))}
        renderItem={(item, isSelected) => (
          <View style={[styles.item, isSelected && styles.itemSelected]}>
            <AppText color="text" size={16}>
              {item.label}
            </AppText>
          </View>
        )}
        placeholder={placeholder}
        labelField="label"
        valueField="value"
        value={value}
        onChange={(item) => {
          onChange(item.value);
        }}
      />
      {name && showFieldError && (
        <FieldError marginTop={8} error={errors?.[name]?.message as string} />
      )}
    </View>
  );
};

export default DropdownPickerValidated;

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    dropdown: {
      height: 46,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 16,
      borderColor: colors.textSecondary,
      backgroundColor: colors.background
    },
    dropdownContainer: {
      backgroundColor: colors.background
    },
    placeholderStyle: {
      fontSize: 16,
      color: colors.textSecondary
    },
    selectedTextStyle: {
      fontSize: 14,
      color: colors.text
    },
    item: {
      padding: 12,
      backgroundColor: colors.background
    },
    itemSelected: {
      backgroundColor: colors.backgroundSelected
    }
  });

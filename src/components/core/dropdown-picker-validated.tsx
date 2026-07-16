import AppText from '@/components/core/app-text';
import { useTheme } from '@/hooks/use-theme';
import FieldError from '@/lib/form/components/field-error';
import { CaretDownIcon } from 'phosphor-react-native';
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
  const theme = useTheme();
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
        style={[styles.dropdown]}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        containerStyle={{
          backgroundColor: theme.colors.background
        }}
        renderRightIcon={() => <CaretDownIcon size={10} />}
        data={items.map((item) => ({
          label: getText ? getText(item) : item,
          value: item
        }))}
        renderItem={(item, isSelected) => (
          <View
            style={{
              padding: 12,
              backgroundColor: isSelected ? 'backgroundElement' : 'background'
            }}>
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

const styles = StyleSheet.create({
  container: {},
  dropdown: {
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontFamily: 'body',
    fontSize: 16,
    borderColor: 'border',
    backgroundColor: 'background'
  },
  placeholderStyle: {
    fontFamily: 'body',
    fontSize: 16,
    color: 'textSecondary'
  },
  selectedTextStyle: {
    fontFamily: 'body',
    fontSize: 14,
    color: 'text'
  },
  label: {
    flexDirection: 'row',
    marginBottom: 8,
    borderColor: 'border',
    backgroundColor: 'backgroundElement'
  }
});

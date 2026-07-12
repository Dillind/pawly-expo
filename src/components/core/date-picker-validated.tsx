import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import FieldError from '@/lib/form/components/field-error';
import { CalendarIcon } from 'phosphor-react-native';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import IndicatedText from './indicated-text';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  name?: string;
  label?: string;
  description?: string;
  isLabelIndicated?: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

const DatePickerValidated = ({
  marginBottom,
  marginTop,
  name,
  label,
  description,
  isLabelIndicated,
  selectedDate,
  setSelectedDate
}: Props) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [date, _setDate] = useState<Date>(new Date());
  const form = useFormContext();
  const { errors } = useFormState({ control: form?.control, name });
  const isError = name && errors?.[name]?.message;
  const styles = useThemedStyles((colors) => ({
    container: {},
    datePickerContainer: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 46,
      paddingHorizontal: 12,
      gap: 12,
      backgroundColor: colors.background
    }
  }));

  return (
    <View style={[styles.container, { marginBottom, marginTop }]}>
      <DateTimePickerModal
        mode="date"
        isVisible={isVisible}
        date={date}
        display="inline"
        pickerStyleIOS={{ height: 340 }}
        modalPropsIOS={{ presentationStyle: 'overFullScreen' }}
        onConfirm={(date) => {
          setSelectedDate(dayjs(date).format('YYYY-MM-DD'));
          setIsVisible(false);
        }}
        onCancel={() => {
          setIsVisible(false);
        }}
        maximumDate={new Date()}
      />
      {label &&
        (isLabelIndicated ? (
          <IndicatedText text={label} marginBottom={description ? 0 : 8} textColor="text" />
        ) : (
          <AppText color="text" size={16} style={{ marginBottom: description ? 0 : 8 }}>
            {label}
          </AppText>
        ))}
      {description && (
        <AppText size={14} style={{ marginBottom: 8 }} color="textSecondary">
          {description}
        </AppText>
      )}
      <PressableOpacity style={styles.datePickerContainer} onPress={() => setIsVisible(true)}>
        <AppText color={selectedDate ? 'text' : 'textSecondary'} size={14}>
          {selectedDate ? dayjs(selectedDate).format('DD / MM / YYYY') : 'dd / mm / yyyy'}
        </AppText>
        <CalendarIcon size={16} color={theme.text} />
      </PressableOpacity>
      {isError && <FieldError marginTop={8} error={errors?.[name]?.message as string} />}
    </View>
  );
};

export default DatePickerValidated;

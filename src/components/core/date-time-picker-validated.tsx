import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useState } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import IndicatedText from './indicated-text';

dayjs.extend(customParseFormat);

type Props = {
  marginTop?: number;
  marginBottom?: number;
  name?: string;
  label?: string;
  description?: string;
  isLabelIndicated?: boolean;
  mode?: 'date' | 'time';
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  /**
   * Render the spinner in the layout instead of behind a tap-to-open modal.
   * Required inside a TrueSheet: measured on iOS 26, react-native-modal-
   * datetime-picker's PopoverDismissRegion survives onConfirm and covers the
   * whole screen, so the sheet's own buttons stop responding for good. The
   * control is still the native spinner either way -- only the presentation
   * differs (AGENTS.md -> Sheets, and Forms -> Dates and times).
   */
  isInline?: boolean;
};

const storeFormat: Record<'date' | 'time', string> = {
  date: 'YYYY-MM-DD',
  time: 'HH:mm'
};

const displayFormat: Record<'date' | 'time', string> = {
  date: 'DD / MM / YYYY',
  time: 'h:mm A'
};

const placeholderText: Record<'date' | 'time', string> = {
  date: 'dd / mm / yyyy',
  time: 'hh:mm'
};

const DateTimePickerValidated = ({
  marginBottom,
  marginTop,
  name,
  label,
  description,
  isLabelIndicated,
  mode = 'date',
  selectedDate,
  setSelectedDate,
  isInline
}: Props) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const form = useFormContext();
  const { errors } = useFormState({ control: form?.control, name });
  const isError = name && errors?.[name]?.message;
  const styles = useStyles(makeStyles);

  const date = selectedDate ? dayjs(selectedDate, storeFormat[mode]).toDate() : new Date();

  return (
    <View style={[styles.container, { marginBottom, marginTop }]}>
      {!isInline && (
        <DateTimePickerModal
          mode={mode}
          isVisible={isVisible}
          date={date}
          display={mode === 'time' ? 'spinner' : 'inline'}
          pickerStyleIOS={{ height: mode === 'time' ? 216 : 340 }}
          modalPropsIOS={{ presentationStyle: 'overFullScreen' }}
          onConfirm={(picked) => {
            setSelectedDate(dayjs(picked).format(storeFormat[mode]));
            setIsVisible(false);
          }}
          onCancel={() => {
            setIsVisible(false);
          }}
          maximumDate={mode === 'date' ? new Date() : undefined}
        />
      )}
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
      {isInline ? (
        <DateTimePicker
          value={date}
          mode={mode}
          display={mode === 'time' ? 'spinner' : 'inline'}
          style={{ height: mode === 'time' ? 216 : 340 }}
          maximumDate={mode === 'date' ? new Date() : undefined}
          onChange={(_, picked) => {
            if (picked) setSelectedDate(dayjs(picked).format(storeFormat[mode]));
          }}
        />
      ) : (
        <PressableOpacity style={styles.pickerContainer} onPress={() => setIsVisible(true)}>
          <AppText color={selectedDate ? 'text' : 'textSecondary'} size={14}>
            {selectedDate
              ? dayjs(selectedDate, storeFormat[mode]).format(displayFormat[mode])
              : placeholderText[mode]}
          </AppText>
          <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={16} />
        </PressableOpacity>
      )}
      {isError && <FieldError marginTop={8} error={errors?.[name]?.message as string} />}
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {},
    pickerContainer: {
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
  });

export default DateTimePickerValidated;

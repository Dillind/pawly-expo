import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useState } from 'react';
import { useFormContext, useFormState, type Control, type FieldValues } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
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
  setSelectedDate
}: Props) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const form = useFormContext();
  const styles = useStyles(makeStyles);

  const date = selectedDate ? dayjs(selectedDate, storeFormat[mode]).toDate() : new Date();

  return (
    <View style={[styles.container, { marginBottom, marginTop }]}>
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

          // A picker fires no blur, so under `onTouched` the field is never
          // marked touched and an error it already shows has nothing to clear
          // it -- the member fixes the field and the message stays put.
          if (form && name) void form.trigger(name);
        }}
        onCancel={() => {
          setIsVisible(false);
        }}
        maximumDate={mode === 'date' ? new Date() : undefined}
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
      <PressableOpacity style={styles.pickerContainer} onPress={() => setIsVisible(true)}>
        <AppText color={selectedDate ? 'text' : 'textSecondary'} size={14}>
          {selectedDate
            ? dayjs(selectedDate, storeFormat[mode]).format(displayFormat[mode])
            : placeholderText[mode]}
        </AppText>
        <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={16} />
      </PressableOpacity>
      {form && name && <SubscribedFieldError control={form.control} name={name} />}
    </View>
  );
};

/**
 * The subscription lives in a child so it is only mounted when there is a form
 * to subscribe to. useFormState throws on a null control, so calling it
 * unconditionally crashed the picker anywhere it was used outside a
 * FormProvider -- which is every "pick a time" that is not a validated field.
 */
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

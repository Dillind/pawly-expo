import { useFormContext, useFormState, type Control, type FieldValues } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { hapticSelection } from '@/lib/haptics';

/** Sunday first, matching Postgres `extract(dow ...)`, but shown Monday first. */
const DAYS = [
  { value: 1, initial: 'M', name: 'Monday' },
  { value: 2, initial: 'T', name: 'Tuesday' },
  { value: 3, initial: 'W', name: 'Wednesday' },
  { value: 4, initial: 'T', name: 'Thursday' },
  { value: 5, initial: 'F', name: 'Friday' },
  { value: 6, initial: 'S', name: 'Saturday' },
  { value: 0, initial: 'S', name: 'Sunday' }
];

type Props = {
  label?: string;
  name?: string;
  value: number[];
  onChange: (value: number[]) => void;
};

const DayOfWeekPicker = ({ label = 'Days', name, value, onChange }: Props) => {
  const styles = useStyles(makeStyles);
  const form = useFormContext();

  const toggle = (day: number) => {
    void hapticSelection();
    onChange(value.includes(day) ? value.filter((each) => each !== day) : [...value, day].sort());
  };

  return (
    <View style={styles.container}>
      <AppText size={14} fontWeight="bold">
        {label}
      </AppText>

      <View style={styles.row}>
        {DAYS.map((day) => {
          const isOn = value.includes(day.value);

          return (
            <PressableOpacity
              key={day.value}
              style={[styles.day, isOn ? styles.on : styles.off]}
              accessibilityRole="button"
              accessibilityLabel={day.name}
              accessibilityState={{ selected: isOn }}
              onPress={() => toggle(day.value)}>
              <AppText
                size={14}
                align="center"
                fontWeight={isOn ? 'bold' : 'regular'}
                color={isOn ? 'primaryText' : 'textSecondary'}>
                {day.initial}
              </AppText>
            </PressableOpacity>
          );
        })}
      </View>

      {form && name && <SubscribedFieldError control={form.control} name={name} />}
    </View>
  );
};

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

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.two
    },
    row: {
      flexDirection: 'row',
      gap: spacing.one
    },
    day: {
      flex: 1,
      // 44pt is the tap target floor, and seven of them still fit a 390pt screen.
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: 10,
      borderCurve: 'continuous'
    },
    on: {
      backgroundColor: colors.primaryMuted
    },
    off: {
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    }
  });

export default DayOfWeekPicker;

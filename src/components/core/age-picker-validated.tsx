import { Host, Picker } from '@expo/ui';
import { useFormContext } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IndicatedText from '@/components/core/indicated-text';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { ageFromBirthdate, birthdateFromAge, formatBirthMonth } from '@/lib/dates';
import FieldError from '@/lib/form/components/field-error';

type Props = {
  name?: string;
  label?: string;
  isLabelIndicated?: boolean;
  /** A birthdate in `YYYY-MM-DD`, the same shape `DateTimePickerValidated` stores. */
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

const WHEEL_HEIGHT = 180;
const MAX_YEARS = 30;
const YEARS = Array.from({ length: MAX_YEARS + 1 }, (_, index) => index);
const MONTHS = Array.from({ length: 12 }, (_, index) => index);

const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;

/**
 * Years and months, for a member who knows "about three" and not the day. The
 * birthdate is derived and stored — the column already holds one date and one
 * boolean, so nothing about the model changes.
 */
const AgePickerValidated = ({
  name,
  label,
  isLabelIndicated,
  selectedDate,
  setSelectedDate
}: Props) => {
  const styles = useStyles(makeStyles);
  const form = useFormContext();
  const error = name ? (form?.formState?.errors?.[name]?.message as string) : undefined;

  const age = selectedDate ? ageFromBirthdate(selectedDate) : { years: 0, months: 0 };

  // A picker fires no blur, so `mode: 'onTouched'` never clears its own error.
  // Validating here is what takes the message off the screen once it is fixed.
  const commit = (next: { years: number; months: number }) => {
    setSelectedDate(birthdateFromAge(next));
    if (name) void form?.trigger(name);
  };

  return (
    <View style={styles.wrapper}>
      {label &&
        (isLabelIndicated ? (
          <IndicatedText text={label} marginBottom={8} />
        ) : (
          <AppText size={14} fontWeight="bold">
            {label}
          </AppText>
        ))}

      <View style={styles.card}>
        <View style={styles.wheel}>
          <Host style={styles.host}>
            <Picker
              appearance="wheel"
              selectedValue={age.years}
              onValueChange={(years) => commit({ ...age, years: Number(years) })}>
              {YEARS.map((years) => (
                <Picker.Item key={years} label={plural(years, 'year')} value={years} />
              ))}
            </Picker>
          </Host>
        </View>

        <View style={styles.divider} />

        <View style={styles.wheel}>
          <Host style={styles.host}>
            <Picker
              appearance="wheel"
              selectedValue={age.months}
              onValueChange={(months) => commit({ ...age, months: Number(months) })}>
              {MONTHS.map((months) => (
                <Picker.Item key={months} label={plural(months, 'month')} value={months} />
              ))}
            </Picker>
          </Host>
        </View>
      </View>

      {selectedDate && (
        <View style={styles.caption}>
          <Icon name="calendar" size={15} color="textSecondary" />
          <AppText size={13} color="textSecondary">
            {formatBirthMonth(selectedDate)}
          </AppText>
        </View>
      )}

      {name && <FieldError marginTop={8} error={error} />}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.two
    },
    card: {
      flexDirection: 'row',
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    wheel: {
      flex: 1
    },
    host: {
      height: WHEEL_HEIGHT
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      marginVertical: spacing.two,
      backgroundColor: colors.border
    },
    caption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.one
    }
  });

export default AgePickerValidated;

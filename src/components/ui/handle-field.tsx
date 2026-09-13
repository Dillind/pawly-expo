import { useCallback, useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import {
  HANDLE_MAX,
  householdHandleSchema,
  RESERVED_HANDLES,
  type HouseholdHandleInput
} from '@/constants/schemas/household';
import type { AppTheme } from '@/constants/theme';
import {
  useHandleAvailable,
  useHandleSuggestions
} from '@/hooks/queries/household/use-household-handle';
import { useDebounce } from '@/hooks/use-debounce';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  // The handle already held, so its own is never called taken.
  currentHandle?: string | null;
  stem: string;
  onAvailabilityChange: (isAvailable: boolean) => void;
  autoFocus?: boolean;
};

const HandleField = ({ currentHandle, stem, onAvailabilityChange, autoFocus }: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  const { control, setValue, setError, clearErrors } = useFormContext<HouseholdHandleInput>();
  const handle = useWatch({ control, name: 'handle' });
  const [settled, isTyping] = useDebounce(handle ?? '');

  // TextInputValidated feeds the native field through `defaultValue`, so form
  // state alone leaves the visible text untouched. Remounting lands the tap.
  const [fieldKey, setFieldKey] = useState(0);

  const isUnchanged = settled === (currentHandle ?? '');
  const isReserved = RESERVED_HANDLES.includes(settled);
  const isWellFormed = householdHandleSchema.safeParse({ handle: settled }).success;

  // Only ask about a handle the schema accepts: "ab" comes back unavailable and
  // reads as taken, which is a different problem.
  const candidate = isWellFormed && !isUnchanged ? settled : undefined;
  const { data: isAvailable, isLoading, isError, refetch } = useHandleAvailable(candidate);

  const isChecking = isTyping || (Boolean(candidate) && isLoading);
  const isFree = !isChecking && isAvailable === true;
  const isTaken = !isChecking && Boolean(candidate) && isAvailable === false;
  const hasFailed = !isChecking && Boolean(candidate) && isError;

  // A reserved word never reaches the availability check, because the schema
  // rejects it first, so it has to ask on its own.
  const isEmptyAndUnset = !isTyping && settled.length === 0 && !currentHandle;
  const wantsSuggestions = !isTyping && (isTaken || isReserved || isEmptyAndUnset);
  const suggestionStem = isEmptyAndUnset ? stem : settled;
  const { data: suggestions = [] } = useHandleSuggestions(
    wantsSuggestions ? suggestionStem : undefined
  );

  useEffect(() => {
    onAvailabilityChange(isFree);
  }, [isFree, onAvailabilityChange]);

  useEffect(() => {
    if (isTaken) setError('handle', { type: 'taken', message: 'Handle already taken' });
    // Save is gated on a positive answer, so a check that never lands would
    // disable it with nothing on screen to explain why.
    else if (hasFailed)
      setError('handle', {
        type: 'unchecked',
        message: 'We could not check that handle. Tap to try again.'
      });
    else if (isFree) clearErrors('handle');
  }, [isTaken, isFree, hasFailed, setError, clearErrors]);

  const choose = useCallback(
    (suggestion: string) => {
      setValue('handle', suggestion, { shouldValidate: true });
      clearErrors('handle');
      setFieldKey((key) => key + 1);
    },
    [setValue, clearErrors]
  );

  const status = (() => {
    if (!settled || isUnchanged) return null;
    if (isChecking) return 'checking' as const;
    if (isFree) return 'free' as const;
    if (isTaken || isReserved) return 'rejected' as const;
    if (hasFailed) return 'unchecked' as const;

    return null;
  })();

  return (
    <View style={styles.field}>
      <TextInputValidated
        key={fieldKey}
        name="handle"
        label="Handle"
        isLabelIndicated
        value={handle ?? ''}
        // Lowercased here too, so the field shows what will be stored.
        onChangeText={(next) => setValue('handle', next.toLowerCase(), { shouldValidate: true })}
        placeholder="kathys-house"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        maxLength={HANDLE_MAX}
        description="3 to 20 characters. Lowercase letters, numbers and hyphens."
        rightIcon={
          status && (
            <View style={styles.statusIcon}>
              {status === 'checking' ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : status === 'unchecked' ? (
                <PressableOpacity onPress={() => void refetch()}>
                  <Icon name="refresh" size={20} color="textSecondary" />
                </PressableOpacity>
              ) : (
                <Icon
                  name={status === 'free' ? 'circleCheck' : 'circleX'}
                  size={20}
                  color="backgroundElement"
                  fill={status === 'free' ? 'success' : 'error'}
                />
              )}
            </View>
          )
        }
      />

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <AppText size={14} color="textSecondary">
            Available:
          </AppText>
          {suggestions.map((suggestion) => (
            <PressableOpacity key={suggestion} onPress={() => choose(suggestion)}>
              <AppText size={14} color="primaryText">
                {suggestion}
              </AppText>
            </PressableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    field: {
      gap: spacing.two
    },
    statusIcon: {
      // 12, not a token, to sit the icon on the field's own text inset.
      paddingRight: 12
    },
    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default HandleField;

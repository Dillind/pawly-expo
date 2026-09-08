import { useCallback, useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import {
  RESERVED_USERNAMES,
  usernameSchema,
  type UsernameFormValues
} from '@/constants/schemas/username';
import type { AppTheme } from '@/constants/theme';
import { useUsernameAvailable, useUsernameSuggestions } from '@/hooks/queries/account/use-username';
import { useDebounce } from '@/hooks/use-debounce';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';

const USERNAME_MAX = 20;

type Props = {
  /** The handle the Member already holds, so their own is never called taken. */
  currentUsername?: string | null;
  /** True only while the settled handle is free to take. */
  onAvailabilityChange: (isAvailable: boolean) => void;
  description?: string;
  autoFocus?: boolean;
};

const UsernameField = ({
  currentUsername,
  onAvailabilityChange,
  description,
  autoFocus
}: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  const { control, setValue, setError, clearErrors } = useFormContext<UsernameFormValues>();
  const username = useWatch({ control, name: 'username' });
  const [settled, isTyping] = useDebounce(username ?? '');

  // TextInputValidated feeds the native field through `defaultValue`, so a
  // suggestion written into form state alone would leave the visible text
  // untouched. Remounting is what makes the tap land.
  const [fieldKey, setFieldKey] = useState(0);

  const isUnchanged = settled === (currentUsername ?? '');
  const isReserved = RESERVED_USERNAMES.includes(settled);
  const isWellFormed = usernameSchema.safeParse({ username: settled }).success;

  // Only ask about a handle the schema already accepts. Asking about "ab" would
  // come back unavailable and read as taken, which is a different problem.
  const candidate = isWellFormed && !isUnchanged ? settled : undefined;
  const { data: isAvailable, isLoading, isError, refetch } = useUsernameAvailable(candidate);

  const isChecking = isTyping || (Boolean(candidate) && isLoading);
  const isFree = !isChecking && isAvailable === true;
  const isTaken = !isChecking && Boolean(candidate) && isAvailable === false;
  const hasFailed = !isChecking && Boolean(candidate) && isError;

  // A reserved word never reaches the availability check -- the schema rejects
  // it first -- so it has to ask for alternatives on its own.
  const wantsSuggestions = !isTyping && (isTaken || isReserved);
  const { data: suggestions = [] } = useUsernameSuggestions(wantsSuggestions ? settled : undefined);

  useEffect(() => {
    onAvailabilityChange(isFree);
  }, [isFree, onAvailabilityChange]);

  useEffect(() => {
    if (isTaken) setError('username', { type: 'taken', message: 'Username already exists' });
    // Continue is gated on a positive answer, so a check that never lands would
    // otherwise disable it with nothing on screen to explain why.
    else if (hasFailed)
      setError('username', {
        type: 'unchecked',
        message: 'We could not check that username. Tap to try again.'
      });
    else if (isFree) clearErrors('username');
  }, [isTaken, isFree, hasFailed, setError, clearErrors]);

  const choose = useCallback(
    (suggestion: string) => {
      setValue('username', suggestion, { shouldValidate: true });
      clearErrors('username');
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
        name="username"
        label="Username"
        isLabelIndicated
        value={username ?? ''}
        // Lowercased here as well as in the schema: the field shows what will be
        // stored, rather than correcting it on submit.
        onChangeText={(next) => setValue('username', next.toLowerCase(), { shouldValidate: true })}
        placeholder="your_name"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        autoFocus={autoFocus}
        maxLength={USERNAME_MAX}
        description={description}
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
              <AppText size={14} color="primary">
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
      // 12 rather than a spacing token, to sit the icon on the same inset as
      // the field's own text.
      paddingRight: 12
    },
    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default UsernameField;

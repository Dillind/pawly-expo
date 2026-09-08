import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { usernameSchema, type UsernameFormValues } from '@/constants/schemas/username';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useUpdateUsername, useUsernameAvailable } from '@/hooks/queries/account/use-username';
import { useDebounce } from '@/hooks/use-debounce';
import { useStyles } from '@/hooks/use-styles';

const USERNAME_MAX = 20;

const UsernameSettings = () => {
  const styles = useStyles(makeStyles);

  const { data: profile } = useUserProfile();
  const { mutate: saveUsername, isPending: isSaving } = useUpdateUsername();

  const form = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: profile?.username ?? '' },
    values: profile ? { username: profile.username ?? '' } : undefined,
    mode: 'onChange'
  });
  const { control, handleSubmit, formState, setValue } = form;

  const username = useWatch({ control, name: 'username' });
  const [settled, isTyping] = useDebounce(username);

  const isUnchanged = settled === (profile?.username ?? '');
  // Only ask about a handle the schema already accepts. Asking about "ab" would
  // come back unavailable and read as "taken", which is a different problem.
  const candidate = !formState.errors.username && !isUnchanged ? settled : undefined;

  const { data: isAvailable, isLoading: isChecking } = useUsernameAvailable(candidate);

  const status = (() => {
    if (!candidate || isTyping || isChecking) return null;
    if (isAvailable === true) return { isFree: true, text: 'Username is available' };
    if (isAvailable === false) return { isFree: false, text: 'Username is already taken' };

    return null;
  })();

  const canSave = Boolean(candidate) && isAvailable === true && !isSaving;

  const submit = handleSubmit((values) => saveUsername(values.username));

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <FormProvider {...form}>
          <TextInputValidated
            name="username"
            label="Username"
            isLabelIndicated
            value={username}
            // Lowercased here as well as in the schema: the field shows what
            // will be stored, rather than correcting it on submit.
            onChangeText={(next) =>
              setValue('username', next.toLowerCase(), { shouldValidate: true })
            }
            placeholder="your_name"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            maxLength={USERNAME_MAX}
            description="This is the name other members see on posts, comments and notifications."
          />

          {status && (
            <View style={styles.status}>
              <Icon
                name={status.isFree ? 'check' : 'close'}
                size={16}
                color={status.isFree ? 'success' : 'error'}
              />
              <AppText size={14} color={status.isFree ? 'success' : 'error'}>
                {status.text}
              </AppText>
            </View>
          )}

          <MainButton
            text="Save username"
            isLoading={isSaving}
            isDisabled={!canSave}
            onPress={submit}
          />
        </FormProvider>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
      paddingHorizontal: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default UsernameSettings;

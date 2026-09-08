import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import UsernameField from '@/components/ui/username-field';
import { usernameSchema, type UsernameFormValues } from '@/constants/schemas/username';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useUpdateUsername } from '@/hooks/queries/account/use-username';
import { useStyles } from '@/hooks/use-styles';

const UsernameSettings = () => {
  const styles = useStyles(makeStyles);

  const { data: profile } = useUserProfile();
  const { mutate: saveUsername, isPending: isSaving } = useUpdateUsername();
  const [isAvailable, setIsAvailable] = useState(false);

  const form = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: profile?.username ?? '' },
    values: profile ? { username: profile.username ?? '' } : undefined,
    mode: 'onChange'
  });

  const submit = form.handleSubmit((values) => saveUsername(values.username));

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <FormProvider {...form}>
          <UsernameField
            currentUsername={profile?.username}
            onAvailabilityChange={setIsAvailable}
            description="This is the name other members see on posts, comments and notifications."
          />

          <MainButton
            text="Save username"
            isLoading={isSaving}
            isDisabled={!isAvailable || isSaving}
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
    }
  });

export default UsernameSettings;

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import UsernameField from '@/components/ui/username-field';
import { usernameSchema, type UsernameFormValues } from '@/constants/schemas/username';
import type { AppTheme } from '@/constants/theme';
import { useUpdateUsername } from '@/hooks/queries/account/use-username';
import { useStyles } from '@/hooks/use-styles';

const UsernameStep = () => {
  const styles = useStyles(makeStyles);
  const { mutate: saveUsername, isPending: isSaving } = useUpdateUsername();
  const [isAvailable, setIsAvailable] = useState(false);

  const form = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
    mode: 'onChange'
  });

  const onSubmit = form.handleSubmit((values) => saveUsername(values.username));

  return (
    <ScreenView>
      <ScreenScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Pick a username"
          description="This is how your household sees you on posts, comments and notifications."
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <UsernameField autoFocus onAvailabilityChange={setIsAvailable} />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSaving ? 'Saving…' : 'Continue'}
              isLoading={isSaving}
              isDisabled={isSaving || !isAvailable}
              onPress={() => {
                void onSubmit();
              }}
            />
          </View>
        </FormProvider>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingVertical: spacing.four,
      gap: spacing.three
    },
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: 'auto'
    }
  });

export default UsernameStep;

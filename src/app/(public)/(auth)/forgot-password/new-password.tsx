import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import PasswordGuidelines from '@/components/screens/auth/password-guidelines';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues
} from '@/constants/schemas/reset-password';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { logError, userFacingMessage } from '@/lib/errors';
import { hapticLight } from '@/lib/haptics';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

const ResetPassword = () => {
  const styles = useStyles(makeStyles);
  const { setRecovering } = useAuthStore();
  const router = useRouter();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onTouched'
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    try {
      await AuthService.updatePassword({ password: values.password });
      showSuccessToast(SuccessMessage.PasswordUpdated);
      setRecovering(false);
    } catch (error) {
      logError(error);
      showErrorToast(ErrorMessage.PasswordUpdateFailed, userFacingMessage(error, 'Try again'));
    }
  });

  const startOver = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      logError(error);
    } finally {
      setRecovering(false);
      router.replace('/forgot-password');
    }
  };

  return (
    <ScreenView edges={['bottom']}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Choose a new password"
          description="Pick something you have not used here before."
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="password"
                  label="New password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="next"
                  testID="reset-password-password"
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="confirmPassword"
                  label="Confirm new password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Type it again"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="reset-password-confirm"
                />
              )}
            />

            <PasswordGuidelines />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Saving password…' : 'Save password'}
              isLoading={isSubmitting}
              isDisabled={isSubmitting || !isValid}
              onPress={() => {
                void onSubmit();
              }}
            />

            <PressableOpacity
              style={styles.startOver}
              onPress={() => {
                void startOver();
              }}>
              <AppText size={14} fontWeight="bold" color="primary">
                Start over
              </AppText>
            </PressableOpacity>
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
      marginTop: spacing.two
    },
    startOver: {
      alignSelf: 'center'
    }
  });

export default ResetPassword;

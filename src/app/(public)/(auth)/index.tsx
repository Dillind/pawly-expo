import TextDescriptionHeader from '@/components/layout/text-description-header';
import { signInSchema, type SignInFormValues } from '@/constants/schemas/sign-in';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

const SignIn = () => {
  const styles = useStyles(makeStyles);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    // Supabase auth will replace this placeholder.
    toast.success('Sign in coming soon', {
      description: `Ready for ${values.email}`
    });
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Welcome back"
          description="Sign in to coordinate care for your pet."
        />
      </ScrollView>
    </View>

    // <FormProvider {...form}>
    //   <View style={styles.form}>
    //     <Controller
    //       control={control}
    //       name="email"
    //       render={({ field: { onChange, onBlur, value } }) => (
    //         <TextInputValidated
    //           name="email"
    //           label="Email"
    //           value={value}
    //           onChangeText={onChange}
    //           onBlur={onBlur}
    //           placeholder="you@example.com"
    //           keyboardType="email-address"
    //           autoCapitalize="none"
    //           autoComplete="email"
    //           returnKeyType="next"
    //           testID="sign-in-email"
    //         />
    //       )}
    //     />
    //     <Controller
    //       control={control}
    //       name="password"
    //       render={({ field: { onChange, onBlur, value } }) => (
    //         <TextInputValidated
    //           name="password"
    //           label="Password"
    //           value={value}
    //           onChangeText={onChange}
    //           onBlur={onBlur}
    //           placeholder="Your password"
    //           secureTextEntry
    //           autoCapitalize="none"
    //           autoComplete="password"
    //           returnKeyType="done"
    //           onSubmitEditing={() => {
    //             void onSubmit();
    //           }}
    //           testID="sign-in-password"
    //         />
    //       )}
    //     />
    //   </View>

    //   <View style={styles.actions}>
    //     <MainButton
    //       text={isSubmitting ? 'Signing in…' : 'Sign in'}
    //       isLoading={isSubmitting}
    //       isDisabled={isSubmitting}
    //       onPress={() => {
    //         void onSubmit();
    //       }}
    //     />

    //     <Link href="/forgot-password" asChild>
    //       <PressableOpacity style={styles.forgotPassword}>
    //         <AppText color="textSecondary" size={16} align="center">
    //           Forgot password?
    //         </AppText>
    //       </PressableOpacity>
    //     </Link>
    //   </View>
    // </FormProvider>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
    },
    title: {
      marginTop: spacing.two
    },
    subtitle: {
      marginBottom: spacing.one
    },
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    },
    submitHost: {
      alignSelf: 'stretch'
    },
    forgotPassword: {
      alignSelf: 'center',
      paddingVertical: spacing.one
    },
    button: {
      alignSelf: 'stretch',
      width: '100%'
    }
  });

export default SignIn;

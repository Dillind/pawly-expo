import OtpVerifyForm from '@/components/screens/auth/otp-verify-form';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { useLocalSearchParams, useRouter } from 'expo-router';

const VerifyReset = () => {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { setRecovering } = useAuthStore();

  const onVerify = async (token: string) => {
    setRecovering(true);

    try {
      await AuthService.verifyRecoveryOtp({ email, token });
      router.push('/forgot-password/new-password');
    } catch (error) {
      setRecovering(false);
      throw error;
    }
  };

  return (
    <OtpVerifyForm
      title="Check your email"
      description={`Enter the 6-digit code we sent to ${email}.`}
      onVerify={onVerify}
      onResend={() => AuthService.resetPasswordForEmail({ email })}
      testID="verify-reset-token"
    />
  );
};

export default VerifyReset;

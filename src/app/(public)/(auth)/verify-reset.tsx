import OtpVerifyForm from '@/components/screens/auth/otp-verify-form';
import AuthService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { useLocalSearchParams, useRouter } from 'expo-router';

const VerifyReset = () => {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { setRecovering } = useAuthStore();

  const onVerify = async (token: string) => {
    // Set before verifying: verifyOtp resolving flips the session, and the guard
    // has to already be held or the router swaps to (protected) mid-flow.
    setRecovering(true);

    try {
      await AuthService.verifyRecoveryOtp({ email, token });
      router.push('/reset-password');
    } catch (error) {
      setRecovering(false);
      throw error;
    }
  };

  return (
    <OtpVerifyForm
      title="Check your email"
      description={`Enter the 8-digit code we sent to ${email}.`}
      onVerify={onVerify}
      testID="verify-reset-token"
    />
  );
};

export default VerifyReset;

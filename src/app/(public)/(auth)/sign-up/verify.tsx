import OtpVerifyForm from '@/components/screens/auth/otp-verify-form';
import AuthService from '@/services/auth.service';
import { useLocalSearchParams } from 'expo-router';

const VerifySignUp = () => {
  const { email } = useLocalSearchParams<{ email: string }>();

  // No manual navigation on success: verifying flips the Supabase session, which
  // the root layout's AuthGate reacts to and swaps to (protected) itself.
  const onVerify = async (token: string) => {
    await AuthService.verifySignUpOtp({ email, token });
  };

  return (
    <OtpVerifyForm
      title="Check your email"
      description={`Enter the 8-digit code we sent to ${email}.`}
      onVerify={onVerify}
      testID="verify-signup-token"
    />
  );
};

export default VerifySignUp;

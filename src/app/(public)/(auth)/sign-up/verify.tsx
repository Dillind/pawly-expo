import OtpVerifyForm from '@/components/screens/auth/otp-verify-form';
import AuthService from '@/services/auth.service';
import { useLocalSearchParams } from 'expo-router';

const VerifySignUp = () => {
  const { email } = useLocalSearchParams<{ email: string }>();

  const onVerify = async (token: string) => {
    await AuthService.verifySignUpOtp({ email, token });
  };

  return (
    <OtpVerifyForm
      title="Check your email"
      description={`Enter the 6-digit code we sent to ${email}.`}
      onVerify={onVerify}
      onResend={() => AuthService.resendSignUpOtp({ email })}
      testID="verify-signup-token"
    />
  );
};

export default VerifySignUp;

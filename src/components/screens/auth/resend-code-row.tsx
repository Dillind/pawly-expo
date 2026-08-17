import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { retryAfterSeconds } from '@/lib/auth-errors';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  onResend: () => Promise<void>;
  cooldownSeconds?: number;
};

/**
 * Supabase refuses a second email inside its own max_frequency window, so the
 * countdown is not politeness -- without it the button reliably fails. The
 * server's own remaining time wins whenever it tells us one, because the
 * interval is a project setting this app cannot read.
 */
const ResendCodeRow = ({ onResend, cooldownSeconds = 60 }: Props) => {
  const styles = useStyles(makeStyles);
  const [remaining, setRemaining] = useState(cooldownSeconds);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (remaining <= 0) return;

    const timer = setInterval(() => setRemaining((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const isDisabled = remaining > 0 || isSending;

  const handleResend = async () => {
    if (isDisabled) return;
    setIsSending(true);

    try {
      await onResend();
      setRemaining(cooldownSeconds);
    } catch (error) {
      setRemaining(retryAfterSeconds(error) ?? cooldownSeconds);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppText size={14} color="textSecondary">
        {"Didn't get a code?"}
      </AppText>
      <PressableOpacity
        disabled={isDisabled}
        onPress={() => {
          void handleResend();
        }}
        testID="resend-code">
        <AppText size={14} fontWeight="bold" color={isDisabled ? 'textSecondary' : 'primary'}>
          {remaining > 0 ? `Send again (${remaining}s)` : 'Send again'}
        </AppText>
      </PressableOpacity>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.one
    }
  });

export default ResendCodeRow;

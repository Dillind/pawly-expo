import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  prompt?: string;
  linkText: string;
  href: Href;
  isReplace?: boolean;
};

const AuthFooterLink = ({ prompt, linkText, href, isReplace }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      {prompt ? (
        <AppText color="textSecondary" size={14}>
          {prompt}
        </AppText>
      ) : null}
      <Link href={href} replace={isReplace} asChild>
        <PressableOpacity>
          <AppText color="primary" size={14} fontWeight="bold">
            {linkText}
          </AppText>
        </PressableOpacity>
      </Link>
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

export default AuthFooterLink;

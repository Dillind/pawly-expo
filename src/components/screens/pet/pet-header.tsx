import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatAge } from '@/lib/dates';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

type Props = {
  name: string;
  breed: string | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
};

const PetHeader = ({ name, breed, birthdate, birthdateIsApproximate, photoUrl }: Props) => {
  const styles = useStyles(makeStyles);
  const age = formatAge(birthdate, birthdateIsApproximate);
  const subtitle = [breed, age].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <Image source={photoUrl} style={styles.photo} contentFit="cover" transition={200} />

      <AppText variant="header" size={28}>
        {name}
      </AppText>

      {subtitle.length > 0 && (
        <AppText size={15} color="textSecondary">
          {subtitle}
        </AppText>
      )}
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.two, alignItems: 'center' },
    photo: {
      width: 120,
      height: 120,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundElement
    }
  });

export default PetHeader;

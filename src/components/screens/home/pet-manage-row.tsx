import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  pet: Pet;
};

const PetManageRow = ({ pet }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <Link href={`/home/pet/${pet.id}`} asChild>
      <PressableOpacity style={styles.row} accessibilityLabel={pet.name}>
        {pet.photoUrl ? (
          <Image source={pet.photoUrl} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Icon name="pawPrint" size={18} color="primary" />
          </View>
        )}

        <AppText size={16} style={styles.name}>
          {pet.name}
        </AppText>

        <Icon name="caretRight" size={16} color="textSecondary" />
      </PressableOpacity>
    </Link>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    avatarPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryMuted
    },
    name: {
      flex: 1
    }
  });

export default PetManageRow;

import { type AppTheme } from '@/constants/theme';
import { usePetPhotos } from '@/hooks/queries/pet/use-pet-photos';
import { useStyles } from '@/hooks/use-styles';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function PetPhotoScreen() {
  const styles = useStyles(makeStyles);
  const { petId, photoId } = useLocalSearchParams<{ petId: string; photoId: string }>();
  const { data: photos, isLoading } = usePetPhotos(petId);

  const photo = photos?.find((candidate) => candidate.id === photoId);

  if (isLoading) {
    return (
      <View style={styles.stage}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!photo) return <View style={styles.stage} />;

  return (
    <View style={styles.stage}>
      <Image
        source={photo.url}
        style={styles.photo}
        contentFit="contain"
        transition={150}
        accessibilityLabel="Photo"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    stage: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center'
    },
    photo: {
      width: '100%',
      height: '100%'
    }
  });

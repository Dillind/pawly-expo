import { type AppTheme } from '@/constants/theme';
import { usePost } from '@/hooks/queries/posts/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function PostPhotoScreen() {
  const styles = useStyles(makeStyles);
  const { postId, photoId } = useLocalSearchParams<{ postId: string; photoId: string }>();
  const { userId } = useAuthStore();
  const { data: post, isLoading } = usePost(postId, userId ?? undefined);

  const photo = post?.photos.find((candidate) => candidate.id === photoId);

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

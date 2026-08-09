import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenView from '@/components/layout/screen-view';
import PostComposer from '@/components/screens/household/post-composer';
import { postSchema, type PostFormValues } from '@/constants/schemas/post';
import { ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { usePets } from '@/hooks/queries/use-pets';
import { useCreatePost } from '@/hooks/queries/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMPTY_DRAFT: PostFormValues = { localUri: '', caption: '', petIds: [] };

const NewPost = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: pets = [] } = usePets();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: EMPTY_DRAFT,
    mode: 'onChange'
  });

  const { control, handleSubmit } = form;
  const localUri = useWatch({ control, name: 'localUri' });
  const caption = useWatch({ control, name: 'caption' });

  const { mutate: createPost, isPending: isSharing } = useCreatePost(household?.id);

  const hasContent = Boolean(localUri) || caption.trim().length > 0;

  /**
   * Cancel IS the discard -- there is no draft to keep and no "Discard post"
   * row, unlike the Hevy screen this is modelled on, where a workout already
   * exists by the time you reach it. Nothing entered means nothing to lose, so
   * the alert only appears when there is something to throw away.
   */
  const cancel = () => {
    if (!hasContent) {
      router.back();
      return;
    }

    Alert.alert('Discard post?', undefined, [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  const share = handleSubmit((values) => {
    if (!userId || !household?.id) return;

    createPost(
      {
        userId,
        localUri: values.localUri,
        caption: values.caption.trim() || null,
        petIds: values.petIds
      },
      // Only the navigation lives here. The toast belongs to the hook, so an
      // upload that outlives this screen still reports.
      { onSuccess: () => router.back() }
    );
  });

  return (
    <ScreenView edges={[]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing.three) }]}>
        <PressableOpacity onPress={cancel} accessibilityRole="button" disabled={isSharing}>
          <AppText size={16} color="primary">
            Cancel
          </AppText>
        </PressableOpacity>

        <AppText size={16} fontWeight="bold">
          New Post
        </AppText>

        <MainButton
          text="Post"
          onPress={() => {
            void share();
          }}
          isLoading={isSharing}
          // A photo is required: a caption on its own is a message, and the
          // moment those exist people expect replies, which v1 does not have.
          isDisabled={!localUri}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormProvider {...form}>
          <PostComposer pets={pets} />
        </FormProvider>
      </KeyboardAvoidingView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.three,
      paddingHorizontal: ScreenGutter,
      paddingBottom: spacing.three,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.backgroundSelected
    },
    body: {
      flex: 1
    }
  });

export default NewPost;

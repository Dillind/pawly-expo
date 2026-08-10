import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenView from '@/components/layout/screen-view';
import PostComposer from '@/components/screens/household/post-composer';
import { postSchema, type PostFormValues } from '@/constants/schemas/post';
import { ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { usePets } from '@/hooks/queries/use-pets';
import { usePost, useUpdatePost } from '@/hooks/queries/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EditPost = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: pets = [] } = usePets();
  const { data: post, isLoading, isError, refetch } = usePost(postId, userId ?? undefined);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { localUri: '', caption: '', petIds: [] },
    mode: 'onChange'
  });

  const { handleSubmit, reset, formState } = form;

  // The form mounts before the post arrives, so the fetched values land via
  // reset -- which also keeps it pristine, so Save stays disabled until an
  // actual edit.
  useEffect(() => {
    if (!post) return;

    reset({
      localUri: post.photoUrls[0] ?? '',
      caption: post.caption ?? '',
      petIds: post.pets.map((pet) => pet.id)
    });
  }, [post, reset]);

  const { mutate: updatePost, isPending: isSaving } = useUpdatePost(household?.id);

  const cancel = () => {
    if (!formState.isDirty) {
      router.back();
      return;
    }

    Alert.alert('Discard your changes?', undefined, [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  const save = handleSubmit((values) => {
    if (!postId) return;

    updatePost(
      {
        postId,
        caption: values.caption.trim() || null,
        petIds: values.petIds
      },
      { onSuccess: () => router.back() }
    );
  });

  return (
    <ScreenView edges={[]}>
      <KeyboardAwareScrollView>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing.three) }]}>
          <PressableOpacity onPress={cancel} accessibilityRole="button" disabled={isSaving}>
            <AppText size={16} color="primary">
              Cancel
            </AppText>
          </PressableOpacity>

          <AppText size={16} fontWeight="bold">
            Edit Post
          </AppText>

          <MainButton
            text="Save"
            onPress={() => {
              void save();
            }}
            isLoading={isSaving}
            isDisabled={!post || !formState.isDirty}
          />
        </View>

        {isLoading && <ActivityIndicator style={styles.centred} />}

        {isError && (
          <ErrorState
            description="Could not load that post."
            onRetry={() => {
              void refetch();
            }}
          />
        )}

        {post && (
          <FormProvider {...form}>
            <PostComposer pets={pets} canReplacePhoto={false} />
          </FormProvider>
        )}
      </KeyboardAwareScrollView>
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
    centred: {
      paddingVertical: spacing.six
    }
  });

export default EditPost;

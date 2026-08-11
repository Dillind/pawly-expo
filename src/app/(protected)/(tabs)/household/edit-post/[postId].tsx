import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import PostComposer from '@/components/screens/household/post-composer';
import PostModalHeader from '@/components/screens/household/post-modal-header';
import { postSchema, type PostFormValues } from '@/constants/schemas/post';
import type { AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { usePets } from '@/hooks/queries/use-pets';
import { usePost, useUpdatePost } from '@/hooks/queries/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

const EditPost = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: pets = [] } = usePets();
  const { data: post, isLoading, isError, refetch } = usePost(postId, userId ?? undefined);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { photos: [], caption: '', petIds: [] },
    mode: 'onChange'
  });

  const { handleSubmit, reset, formState } = form;

  // The form mounts before the post arrives, so the fetched values land via
  // reset -- which also keeps it pristine, so Save stays disabled until an
  // actual edit.
  useEffect(() => {
    if (!post) return;

    reset({
      photos: post.photos.map((photo) => ({
        kind: 'existing' as const,
        storagePath: photo.storagePath,
        uri: photo.url
      })),
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
    if (!postId || !userId) return;

    updatePost(
      {
        postId,
        userId,
        caption: values.caption.trim() || null,
        petIds: values.petIds,
        photos: values.photos.map((photo) =>
          photo.kind === 'existing'
            ? { kind: 'existing' as const, storagePath: photo.storagePath }
            : { kind: 'new' as const, localUri: photo.uri }
        )
      },
      { onSuccess: () => router.back() }
    );
  });

  return (
    <ScreenView edges={[]}>
      <PostModalHeader
        title="Edit Post"
        confirmText="Save"
        isBusy={isSaving}
        isConfirmDisabled={!post || !formState.isDirty}
        onCancel={cancel}
        onConfirm={() => {
          void save();
        }}
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {isLoading && <ActivityIndicator style={styles.centred} />}

        {isError && (
          <ErrorState
            title="Couldn't load this post"
            onRetry={() => {
              void refetch();
            }}
          />
        )}

        {post && (
          <FormProvider {...form}>
            <PostComposer pets={pets} />
          </FormProvider>
        )}
      </KeyboardAwareScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scroll: {
      flex: 1
    },
    centred: {
      paddingVertical: spacing.six
    }
  });

export default EditPost;

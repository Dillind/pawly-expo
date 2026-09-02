import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import ScreenView from '@/components/layout/screen-view';
import PostComposer from '@/components/screens/household/post-composer';
import PostModalHeader from '@/components/screens/household/post-modal-header';
import { postSchema, type PostFormValues } from '@/constants/schemas/post';
import type { AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useCreatePost } from '@/hooks/queries/posts/use-posts';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';

const EMPTY_DRAFT: PostFormValues = {
  title: '',
  photos: [],
  caption: '',
  petIds: [],
  occasionId: null
};

const NewPost = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { userId } = useAuthStore();
  const { data: household } = useHousehold();

  // A post is always written to the Active Household, and the household summary
  // already carries its pets -- so this needs no query of its own.
  const pets = household?.pets ?? [];

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: EMPTY_DRAFT,
    mode: 'onChange'
  });

  const { control, handleSubmit } = form;
  const title = useWatch({ control, name: 'title' });
  const photos = useWatch({ control, name: 'photos' });
  const caption = useWatch({ control, name: 'caption' });

  const { mutate: createPost, isPending: isSharing } = useCreatePost(household?.id);

  const hasContent = title.trim().length > 0 || photos.length > 0 || caption.trim().length > 0;

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
        localUris: values.photos.map((photo) => photo.uri),
        title: values.title.trim(),
        caption: values.caption.trim() || null,
        petIds: values.petIds,
        occasionId: values.occasionId
      },
      { onSuccess: () => router.back() }
    );
  });

  return (
    <ScreenView edges={[]}>
      <PostModalHeader
        title="Create Post"
        confirmText="Post"
        isBusy={isSharing}
        isConfirmDisabled={photos.length === 0 || title.trim().length === 0}
        onCancel={cancel}
        onConfirm={() => {
          void share();
        }}
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <FormProvider {...form}>
          <PostComposer pets={pets} householdName={household?.name} householdId={household?.id} />
        </FormProvider>
      </KeyboardAwareScrollView>
    </ScreenView>
  );
};

const makeStyles = (_theme: AppTheme) =>
  StyleSheet.create({
    scroll: {
      flex: 1
    }
  });

export default NewPost;

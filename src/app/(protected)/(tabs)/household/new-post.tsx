import ScreenView from '@/components/layout/screen-view';
import PostComposer from '@/components/screens/household/post-composer';
import PostModalHeader from '@/components/screens/household/post-modal-header';
import { postSchema, type PostFormValues } from '@/constants/schemas/post';
import { useHousehold } from '@/hooks/queries/use-household';
import { usePets } from '@/hooks/queries/use-pets';
import { useCreatePost } from '@/hooks/queries/use-posts';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

const EMPTY_DRAFT: PostFormValues = { localUri: '', caption: '', petIds: [] };

const NewPost = () => {
  const router = useRouter();

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
      { onSuccess: () => router.back() }
    );
  });

  return (
    <ScreenView edges={[]}>
      <KeyboardAwareScrollView>
        <PostModalHeader
          title="Create Post"
          confirmText="Post"
          isBusy={isSharing}
          isConfirmDisabled={!localUri}
          onCancel={cancel}
          onConfirm={() => {
            void share();
          }}
        />

        <FormProvider {...form}>
          <PostComposer pets={pets} />
        </FormProvider>
      </KeyboardAwareScrollView>
    </ScreenView>
  );
};

export default NewPost;

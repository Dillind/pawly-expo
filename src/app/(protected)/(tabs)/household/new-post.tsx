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
import { Alert, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing.three) }]}>
          <PressableOpacity onPress={cancel} accessibilityRole="button" disabled={isSharing}>
            <AppText size={16} color="primary">
              Cancel
            </AppText>
          </PressableOpacity>

          <AppText size={16} fontWeight="bold">
            Create Post
          </AppText>

          <MainButton
            text="Post"
            onPress={() => {
              void share();
            }}
            isLoading={isSharing}
            isDisabled={!localUri}
          />
        </View>

        <FormProvider {...form}>
          <PostComposer pets={pets} />
        </FormProvider>
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
    body: {
      flex: 1
    }
  });

export default NewPost;

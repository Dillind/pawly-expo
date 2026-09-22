import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import FormTextInput from '@/components/core/form-text-input';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import {
  FEATURE_REQUEST_DESCRIPTION_MAX,
  FEATURE_REQUEST_TITLE_MAX,
  featureRequestSchema,
  type FeatureRequestInput
} from '@/constants/schemas/feature-request';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useCreateFeatureRequest } from '@/hooks/queries/feature-requests/use-feature-request-mutations';
import { useStyles } from '@/hooks/use-styles';
import {
  FeatureRequestCreateError,
  type CreateFeatureRequestError
} from '@/services/feature-request.service';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

const CREATE_ERROR_COPY: Record<CreateFeatureRequestError, string> = {
  daily_limit_reached: 'You can post 5 requests a day. Try again tomorrow.',
  blocked_content: 'Your request has words we do not allow. Please reword it.',
  board_banned: 'You can no longer post on this board.'
};

const EMPTY: FeatureRequestInput = { title: '', description: '' };

const DESCRIPTION_HEIGHT = 140;

const FeatureRequestSheet = ({ sheetRef }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: createRequest, isPending: isPosting } = useCreateFeatureRequest();

  const form = useForm<FeatureRequestInput>({
    resolver: zodResolver(featureRequestSchema),
    defaultValues: EMPTY
  });
  const { handleSubmit, setError, reset } = form;

  const submit = (onDone: () => void) =>
    handleSubmit((values) => {
      createRequest(
        { title: values.title, description: values.description || null },
        {
          onSuccess: onDone,
          onError: (error) => {
            if (error instanceof FeatureRequestCreateError) {
              setError('title', { message: CREATE_ERROR_COPY[error.reason] });
            }
          }
        }
      );
    })();

  return (
    <BaseSheet
      sheetRef={sheetRef}
      title="New request"
      detents={['auto', 1]}
      onDismiss={() => reset(EMPTY)}>
      <FormProvider {...form}>
        <View style={styles.form}>
          <FormTextInput
            name="title"
            label="Title"
            isLabelIndicated
            placeholder="What would you like?"
            maxLength={FEATURE_REQUEST_TITLE_MAX}
            showCharacterCount
            autoFocus
            returnKeyType="next"
          />

          <FormTextInput
            name="description"
            label="Details"
            placeholder="How would it help you and your pet?"
            maxLength={FEATURE_REQUEST_DESCRIPTION_MAX}
            showCharacterCount
            isMultiline
            height={DESCRIPTION_HEIGHT}
          />

          <View style={styles.note}>
            <Icon name="info" size={IconSize.inline} color="textSecondary" />
            <AppText size={13} color="textSecondary" style={styles.noteText}>
              Every Crumpet user can see your request. Your name is not shown. No abusive or
              offensive content.
            </AppText>
          </View>

          <MainButton
            text={isPosting ? 'Posting…' : 'Post'}
            isLoading={isPosting}
            isDisabled={isPosting}
            onPress={() => void submit(() => void sheetRef.current?.dismiss())}
          />
        </View>
      </FormProvider>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    form: {
      gap: spacing.three
    },
    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.two
    },
    noteText: {
      flex: 1,
      lineHeight: 18
    }
  });

export default FeatureRequestSheet;

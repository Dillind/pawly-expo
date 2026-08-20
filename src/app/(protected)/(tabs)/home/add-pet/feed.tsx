import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FeedTimeForm from '@/components/ui/feed-time-form';
import type { AddPetFormValues } from '@/constants/schemas/add-pet';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet } from 'react-native';

/**
 * One feed, pushed. The same FeedTimeForm the pet screen raises in a sheet —
 * inside this flow it cannot be a sheet, because a sheet on a modal is two
 * modals.
 *
 * Which feed is a route param rather than shared state: the screen's identity
 * is in its URL, so a back-and-forward through the stack cannot land it on a
 * different row than the one that was tapped.
 */
const AddPetFeed = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { index } = useLocalSearchParams<{ index?: string }>();

  const { control } = useFormContext<AddPetFormValues>();
  const { append, update, remove } = useFieldArray({ control, name: 'feedTimes' });
  const feedTimes = useWatch({ control, name: 'feedTimes' });

  const position = index === undefined ? -1 : Number(index);
  const existing = position >= 0 ? (feedTimes[position] ?? null) : null;

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        isKeyboardAware
        contentContainerStyle={styles.content}>
        <FeedTimeForm
          feedTime={
            existing
              ? {
                  seriesId: String(position),
                  label: existing.label,
                  localTime: existing.localTime,
                  daysOfWeek: existing.daysOfWeek,
                  instructions: existing.instructions
                }
              : null
          }
          isSaving={false}
          onSubmit={(values) => {
            if (existing) update(position, values);
            else append(values);

            router.back();
          }}
          onRemove={
            existing
              ? () => {
                  remove(position);
                  router.back();
                }
              : undefined
          }
        />
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: { paddingTop: spacing.three, paddingBottom: spacing.six }
  });

export default AddPetFeed;

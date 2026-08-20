import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FeedTimeForm from '@/components/ui/feed-time-form';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import useAddPetStore from '@/stores/add-pet-store';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

/**
 * One feed, pushed. The same FeedTimeForm the pet screen raises in a sheet —
 * inside this flow it cannot be a sheet, because a sheet on a modal is two
 * modals.
 */
const AddPetFeed = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { feedTimes, editingIndex, saveFeedTime, removeFeedTime } = useAddPetStore();

  const existing = editingIndex >= 0 ? (feedTimes[editingIndex] ?? null) : null;

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
                  seriesId: String(editingIndex),
                  label: existing.label,
                  localTime: existing.localTime,
                  daysOfWeek: existing.daysOfWeek,
                  instructions: existing.instructions
                }
              : null
          }
          isSaving={false}
          onSubmit={(values) => {
            saveFeedTime(values);
            router.back();
          }}
          onRemove={
            existing
              ? () => {
                  removeFeedTime(editingIndex);
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

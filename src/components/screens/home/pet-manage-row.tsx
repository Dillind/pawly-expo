import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import StatusPill from '@/components/core/status-pill';
import PetAvatar from '@/components/screens/home/pet-avatar';
import type { AppTheme } from '@/constants/theme';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { usePetPause } from '@/hooks/queries/feeding/use-pet-pause';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';
import { summarisePetDay } from '@/utils/pet-status';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 48;
const PAUSED_OPACITY = 0.55;

type Props = {
  pet: Pet;
  /** The household's today, as YYYY-MM-DD. Absent until the household loads. */
  today?: string;
};

/**
 * One pet, with the one line that says what to do about it.
 *
 * The three queries are per row rather than per screen because a hook cannot be
 * called once per item from a loop -- the same reason PetSection holds its own.
 *
 * A pause is a date range, never a flag, so "paused" is a question about today.
 */
const PetManageRow = ({ pet, today }: Props) => {
  const styles = useStyles(makeStyles);

  const { data: occurrences } = useOccurrences(pet.id, today);
  const { data: pause } = usePetPause(pet.id, today);
  const { data: feedTimes } = useFeedTimes(pet.id);

  const isPaused = Boolean(pause);
  const summary = occurrences
    ? summarisePetDay(occurrences, isPaused, Boolean(feedTimes?.length))
    : null;

  return (
    <Link href={`/home/${pet.id}`} asChild>
      <PressableOpacity style={styles.row} accessibilityLabel={pet.name}>
        <View style={isPaused && styles.dimmed}>
          <PetAvatar photoUrl={pet.photoUrl} size={AVATAR_SIZE} />
        </View>

        <View style={styles.body}>
          <AppText variant="header" size={19} fontWeight="bold" numberOfLines={1}>
            {pet.name}
          </AppText>

          {/* A pause is the state that expects nothing, so it recesses into a
              pill rather than reading as another line of status. */}
          {isPaused ? (
            <StatusPill label="Paused — no feeds expected" />
          ) : (
            summary && (
              <AppText size={13} color="textSecondary" numberOfLines={1}>
                {summary}
              </AppText>
            )
          )}
        </View>

        <Icon name="caretRight" size={18} color="textSecondary" />
      </PressableOpacity>
    </Link>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: spacing.three
    },
    dimmed: {
      opacity: PAUSED_OPACITY
    },
    body: {
      flex: 1,
      gap: spacing.half
    }
  });

export default PetManageRow;

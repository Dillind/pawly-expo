import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import HouseholdCrest from '@/components/core/household-crest';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { type AppTheme } from '@/constants/theme';
import { useRequestFollow } from '@/hooks/queries/follow/use-follows';
import { useStyles } from '@/hooks/use-styles';
import type { FollowRelationship, HouseholdSearchResult } from '@/services/follow.service';
import { countDigits } from '@/utils/counts';

/** The row's crest, exported so the list can inset its dividers to match. */
export const SEARCH_ROW_CREST = 40;

type Props = {
  household: HouseholdSearchResult;
  /** The row answers a term the person has already typed past. See the list. */
  isStale: boolean;
};

type ButtonState = {
  text: string;
  variant: 'primary' | 'secondary';
  hasTick: boolean;
};

/**
 * The button reports where the viewer stands rather than repeating the offer,
 * so only 'none' is pressable. A member gets no button at all.
 */
const BUTTON_STATES: Partial<Record<FollowRelationship, ButtonState>> = {
  none: { text: 'Follow', variant: 'primary', hasTick: false },
  pending: { text: 'Requested', variant: 'secondary', hasTick: false },
  accepted: { text: 'Following', variant: 'secondary', hasTick: true }
};

const HouseholdSearchRow = ({ household, isStale }: Props) => {
  const styles = useStyles(makeStyles);

  // The row owns its own mutation. A single one hoisted to the list would need
  // the pressed household threaded back down, and would spin every button.
  const { mutate: requestFollow, isPending: isRequesting } = useRequestFollow(
    household.householdId
  );

  const state = BUTTON_STATES[household.relationship];

  return (
    <View style={styles.row}>
      {/* The Link wraps the identity only. The button sits outside it, so the
          two press targets never compete for the same touch. */}
      <Link
        href={{ pathname: '/follow/[householdId]', params: { householdId: household.householdId } }}
        asChild>
        <Link.Trigger>
          <PressableOpacity
            style={styles.identity}
            accessibilityRole="button"
            accessibilityLabel={`Open ${household.name}`}>
            <HouseholdCrest size={SEARCH_ROW_CREST} iconSize={20} />
            <View style={styles.text}>
              <AppText size={16} numberOfLines={1}>
                {household.name}
              </AppText>
              <AppText size={13} color="textSecondary" numberOfLines={1}>
                {`@${household.handle} · ${countDigits(household.petCount, 'pet')}`}
              </AppText>
            </View>
          </PressableOpacity>
        </Link.Trigger>
        <Link.Preview />
      </Link>

      {state ? (
        <MainButton
          text={state.text}
          size="sm"
          variant={state.variant}
          isLoading={isRequesting}
          isDisabled={household.relationship !== 'none' || isRequesting || isStale}
          leftIcon={state.hasTick ? <Icon name="check" size={15} color="text" /> : undefined}
          containerStyle={styles.action}
          onPress={() => requestFollow()}
        />
      ) : (
        <AppText size={13} color="textSecondary">
          Your household
        </AppText>
      )}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: 64,
      paddingHorizontal: spacing.three
    },
    identity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three
    },
    text: {
      flex: 1,
      gap: spacing.half
    },
    // MainButton is built full-width and carries alignSelf: 'stretch'. A child's
    // alignSelf beats the row's alignItems, so with its fixed height the button
    // pins to the top of the row instead of centring on the text.
    action: {
      alignSelf: 'center'
    }
  });

export default HouseholdSearchRow;

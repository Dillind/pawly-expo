import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import IconButton from '@/components/core/icon-button';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScrollScreen from '@/components/layout/scroll-screen';
import FollowBackButton from '@/components/screens/follow/follow-back-button';
import FollowPersonRow, {
  FOLLOW_PERSON_AVATAR
} from '@/components/screens/follow/follow-person-row';
import { BottomTabInset, IconSize, Spacing, type AppTheme } from '@/constants/theme';
import {
  useFollowers,
  useFollowRequests,
  useRemoveFollower
} from '@/hooks/queries/follow/use-follows';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useStyles } from '@/hooks/use-styles';
import { namesText } from '@/lib/follow-naming';
import type { Follower } from '@/services/follow.service';
import { fullName } from '@/utils/members';

type Props = {
  householdId: string;
};

// The Households they named, else "Following since August" -- the month they were accepted.
const detailText = (follower: Follower): string => {
  const names = namesText(follower.namedHouseholds.map((household) => household.name));
  if (names) return names;

  const stamp = follower.respondedAt ?? follower.requestedAt;
  const month = new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(new Date(stamp));

  return `Following since ${month}`;
};

// The Owner's audience. Removing is here rather than on a follower's own screen, because there
// is no such screen -- ADR 0036 keeps followers invisible to each other, and that holds for the
// Owner's view of them too.
const FollowersList = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHouseholdById(householdId);
  const { data: followers = [], isLoading, isError, refetch } = useFollowers(householdId);
  const { data: requests = [] } = useFollowRequests(householdId);
  const { mutate: removeFollower } = useRemoveFollower(householdId);

  const isOwner = household?.isOwner ?? false;

  // Removal blocks, so the alert says both halves: access ends, and the door
  // closes. Cancel is preferred because Remove has a consequence.
  const confirmRemove = (follower: Follower) => {
    const name = fullName(follower) || 'this follower';

    Alert.alert(
      `Remove ${name}?`,
      'They stop seeing your posts, and they cannot ask to follow you again.',
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFollower(follower.id)
        }
      ]
    );
  };

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError) {
      return <ErrorState title="Couldn't load your followers" onRetry={() => void refetch()} />;
    }

    return (
      <>
        {isOwner && requests.length > 0 && (
          <SettingsSection>
            <SettingsRow
              icon="userPlus"
              label="Follow requests"
              value={String(requests.length)}
              onPress={() => router.push(`/home/household/${householdId}/followers/requests`)}
            />
          </SettingsSection>
        )}

        {followers.length === 0 ? (
          <EmptyState
            icon="users"
            title="No followers yet"
            description="Send someone your follow link. They ask, and you decide."
          />
        ) : (
          <SettingsSection
            title={`Followers · ${followers.length}`}
            dividerInset={Spacing.three + FOLLOW_PERSON_AVATAR + Spacing.three}>
            {followers.map((follower) => (
              <View key={follower.id} style={styles.row}>
                <FollowPersonRow
                  person={follower}
                  detail={detailText(follower)}
                  trailing={
                    isOwner && (
                      <View style={styles.trailing}>
                        <FollowBackButton person={follower} acceptingHouseholdId={householdId} />
                        <IconButton
                          name="close"
                          variant="ghost"
                          color="textSecondary"
                          size={IconSize.control}
                          accessibilityLabel={`Remove ${fullName(follower) || 'follower'}`}
                          onPress={() => confirmRemove(follower)}
                        />
                      </View>
                    )
                  }
                />
              </View>
            ))}
          </SettingsSection>
        )}

        {isOwner && (
          <SettingsSection title="Share">
            <SettingsRow
              icon="share"
              label="Share a follow link"
              onPress={() => router.push(`/home/household/${householdId}/followers/link`)}
            />
          </SettingsSection>
        )}
      </>
    );
  };

  return <ScrollScreen contentContainerStyle={styles.content}>{renderBody()}</ScrollScreen>;
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      marginTop: spacing.five
    },
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    row: {
      paddingHorizontal: spacing.three
    },
    trailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one
    }
  });

export default FollowersList;

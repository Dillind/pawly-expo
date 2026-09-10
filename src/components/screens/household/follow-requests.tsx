import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import ListCard from '@/components/core/list-card';
import MainButton from '@/components/core/main-button';
import UserAvatar from '@/components/core/user-avatar';
import ScrollScreen from '@/components/layout/scroll-screen';
import { BottomTabInset, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useFollowRequests, useRespondToFollowRequest } from '@/hooks/queries/follow/use-follows';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useStyles } from '@/hooks/use-styles';
import { formatAlertTime } from '@/lib/dates';
import { fullName } from '@/utils/members';

const AVATAR_SIZE = 40;

type Props = {
  householdId: string;
};

/**
 * The Owner's decision, and the one place the boundary is spelled out. It is
 * said here rather than on the follower's landing screen: the person granting
 * the access is the one who needs to know its shape.
 */
const FollowRequests = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);

  const { data: household } = useHouseholdById(householdId);
  const { data: requests = [], isLoading, isError, refetch } = useFollowRequests(householdId);
  const { mutate: respond, isPending: isResponding } = useRespondToFollowRequest(householdId);

  const timezone = household?.timezone ?? 'UTC';

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError) {
      return <ErrorState title="Couldn't load your requests" onRetry={() => void refetch()} />;
    }

    return (
      <>
        <AppText size={14} color="textSecondary">
          A follower reads your posts and pet profiles, and can like and comment. They never see
          feeds, reminders or the Care Card.
        </AppText>

        {requests.length === 0 ? (
          <EmptyState
            icon="userPlus"
            title="Nobody is waiting"
            description="A request lands here when someone opens your follow link."
          />
        ) : (
          requests.map((request) => {
            const name = fullName(request) || 'Someone';
            const detail = formatAlertTime(request.requestedAt, timezone);

            return (
              <ListCard key={request.id} style={styles.card}>
                <View style={styles.person}>
                  <UserAvatar
                    firstName={request.firstName}
                    lastName={request.lastName}
                    avatarUrl={request.avatarUrl}
                    size={AVATAR_SIZE}
                  />
                  <View style={styles.personText}>
                    <AppText size={16} numberOfLines={1}>
                      {name}
                    </AppText>
                    <AppText size={13} color="textSecondary" numberOfLines={1}>
                      {detail}
                    </AppText>
                  </View>
                </View>

                <View style={styles.actions}>
                  <MainButton
                    text="Accept"
                    size="sm"
                    isDisabled={isResponding}
                    containerStyle={styles.action}
                    onPress={() => respond({ followId: request.id, accept: true })}
                  />
                  <MainButton
                    text="Decline"
                    size="sm"
                    variant="secondary"
                    isDisabled={isResponding}
                    containerStyle={styles.action}
                    onPress={() => respond({ followId: request.id, accept: false })}
                  />
                </View>
              </ListCard>
            );
          })
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
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.three
    },
    card: {
      padding: spacing.three,
      gap: spacing.three
    },
    person: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three
    },
    personText: {
      flex: 1,
      gap: spacing.half
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.two
    },
    action: {
      flex: 1
    }
  });

export default FollowRequests;

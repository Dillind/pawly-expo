import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import ScrollScreen from '@/components/layout/scroll-screen';
import FollowBackButton from '@/components/screens/follow/follow-back-button';
import FollowPersonRow from '@/components/screens/follow/follow-person-row';
import { BottomTabInset, ScreenGutter, type AppTheme } from '@/constants/theme';
import {
  useFollowRequests,
  useMarkFollowRequestAlertsRead,
  useRespondToFollowRequest
} from '@/hooks/queries/follow/use-follows';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import { formatRelativeTime } from '@/lib/dates';
import { namesText } from '@/lib/follow-naming';
import { queryKeys } from '@/lib/query-keys';
import type { Follower } from '@/services/follow.service';

type Props = {
  householdId: string;
};

const detailText = (request: Follower, isAccepted: boolean): string => {
  const names = namesText(request.namedHouseholds.map((household) => household.name));

  if (isAccepted) return names ? `${names} · Accepted` : 'Following you';

  return [names, formatRelativeTime(request.requestedAt)].filter(Boolean).join(' · ');
};

// The Owner's decision, and the one place the boundary is spelled out. An
// accepted row stays until the Owner leaves, so Follow back is one more tap.
const FollowRequests = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);

  const { data: requests = [], isLoading, isError, refetch } = useFollowRequests(householdId);
  const {
    mutate: respond,
    variables,
    isPending: isResponding
  } = useRespondToFollowRequest(householdId);
  const { mutate: markAlertsRead } = useMarkFollowRequestAlertsRead(householdId);

  const [accepted, setAccepted] = useState<Follower[]>([]);

  useEffect(() => markAlertsRead(), [markAlertsRead]);
  useRefreshOnFocus(queryKeys.follow.requests(householdId));

  const accept = (request: Follower) =>
    respond(
      { followId: request.id, accept: true },
      { onSuccess: (status) => status === 'accepted' && setAccepted((rows) => [...rows, request]) }
    );

  const acceptedIds = new Set(accepted.map((request) => request.id));
  const rows = [...accepted, ...requests.filter((request) => !acceptedIds.has(request.id))].sort(
    (a, b) => a.requestedAt.localeCompare(b.requestedAt)
  );

  const renderTrailing = (request: Follower) => {
    if (acceptedIds.has(request.id)) {
      return <FollowBackButton person={request} acceptingHouseholdId={householdId} />;
    }

    const isThisOne = isResponding && variables?.followId === request.id;

    return (
      <View style={styles.actions}>
        <MainButton
          text="Accept"
          size="sm"
          isLoading={isThisOne && variables?.accept}
          isDisabled={isResponding}
          onPress={() => accept(request)}
        />
        <MainButton
          text="Decline"
          size="sm"
          variant="secondary"
          isDisabled={isResponding}
          onPress={() => respond({ followId: request.id, accept: false })}
        />
      </View>
    );
  };

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError) {
      return <ErrorState title="Couldn't load your requests" onRetry={() => void refetch()} />;
    }

    return (
      <>
        <AppText size="subhead" color="textSecondary">
          A follower reads your posts and pet profiles, and can like and comment. They never see
          feeds, reminders or the Care Card.
        </AppText>

        {rows.length === 0 ? (
          <EmptyState
            icon="userPlus"
            title="Nobody is waiting"
            description="A request lands here when someone opens your follow link."
          />
        ) : (
          <View>
            {rows.map((request) => (
              <FollowPersonRow
                key={request.id}
                person={request}
                detail={detailText(request, acceptedIds.has(request.id))}
                trailing={renderTrailing(request)}
              />
            ))}
          </View>
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
    actions: {
      flexDirection: 'row',
      gap: spacing.two
    }
  });

export default FollowRequests;

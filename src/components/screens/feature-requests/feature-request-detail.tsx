import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import { SkeletonBlock } from '@/components/core/skeleton';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FeatureRequestTags from '@/components/ui/feature-request-tags';
import FeatureRequestVoteButton from '@/components/ui/feature-request-vote-button';
import { FEATURE_REQUEST_STATUS_OPTIONS } from '@/constants/options';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useToggleVote } from '@/hooks/queries/feature-requests/use-feature-request-mutations';
import {
  useFeatureRequest,
  useIsBoardBanned,
  useIsCrumpetTeam
} from '@/hooks/queries/feature-requests/use-feature-requests';
import { useFeatureRequestActions } from '@/hooks/use-feature-request-actions';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useStyles } from '@/hooks/use-styles';
import { deviceTimezone, formatDayAndShortMonth } from '@/lib/dates';

const FeatureRequestDetail = ({ requestId }: { requestId: string }) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: request, isLoading, isError, refetch } = useFeatureRequest(requestId);
  const { data: isTeam = false } = useIsCrumpetTeam();
  const { data: isBanned = false } = useIsBoardBanned();
  const { mutate: toggleVote } = useToggleVote();
  const actions = useFeatureRequestActions(() => router.back());
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const renderBody = () => {
    if (isError) return <ErrorState onRetry={() => void refetch()} />;

    if (isLoading) {
      return (
        <View style={styles.skeleton}>
          <SkeletonBlock height={28} width="70%" />
          <SkeletonBlock height={16} width="40%" />
          <SkeletonBlock height={96} radius={18} />
        </View>
      );
    }

    if (!request) {
      return (
        <EmptyState
          icon="trash"
          title="This request was removed"
          description="Its author or the Crumpet team deleted it."
          action={
            <MainButton
              text="See all requests"
              variant="secondary"
              onPress={() => router.replace('/profile/settings/feature-requests')}
            />
          }
        />
      );
    }

    return (
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.heading}>
            <AppText variant="header" size={28} fontWeight="bold" style={styles.title}>
              {request.title}
            </AppText>
            <View style={styles.meta}>
              <FeatureRequestTags request={request} />
              <AppText size={13} color="textSecondary">
                Posted {formatDayAndShortMonth(request.createdAt, deviceTimezone())}
              </AppText>
            </View>
          </View>
          <FeatureRequestVoteButton
            count={request.voteCount}
            hasVoted={request.hasVoted}
            isDisabled={isBanned}
            onPress={() => toggleVote({ requestId: request.id, hasVoted: request.hasVoted })}
          />
        </View>
        <View style={styles.divider} />
        {request.description ? (
          <AppText size={16} style={styles.description}>
            {request.description}
          </AppText>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenView edges={[]}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More" hidden={!request}>
          <Stack.Toolbar.MenuAction
            icon="flag"
            destructive
            hidden={!request || request.isMine || isBanned}
            onPress={() => request && actions.report(request)}>
            Report
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="eye.slash"
            hidden={!request || request.isMine}
            onPress={() => request && actions.hideAuthor(request)}>
            Hide requests from this person
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            hidden={!request?.isMine}
            onPress={() => request && actions.confirmDelete(request)}>
            Delete
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu inline title="Crumpet team" hidden={!isTeam}>
            <Stack.Toolbar.Menu title="Set status" icon="tag">
              {FEATURE_REQUEST_STATUS_OPTIONS.map((option) => (
                <Stack.Toolbar.MenuAction
                  key={option.value}
                  isOn={request?.status === option.value}
                  onPress={() => request && actions.setStatus(request, option.value)}>
                  {option.label}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.MenuAction
              icon="arrow.uturn.backward"
              hidden={!request || request.reportCount === 0}
              onPress={() => request && actions.restore(request)}>
              Restore
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon="trash"
              destructive
              hidden={!request || request.isMine}
              onPress={() => request && actions.confirmDelete(request)}>
              Delete request
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}>
        {renderBody()}
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingTop: spacing.two,
      paddingBottom: BottomTabInset + spacing.four,
      flexGrow: 1
    },
    body: {
      gap: spacing.three
    },
    top: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.three
    },
    heading: {
      flex: 1,
      gap: spacing.two + spacing.half
    },
    title: {
      lineHeight: 32,
      letterSpacing: -0.4
    },
    meta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.two
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
    },
    description: {
      lineHeight: 24
    },
    skeleton: {
      gap: spacing.three
    }
  });

export default FeatureRequestDetail;

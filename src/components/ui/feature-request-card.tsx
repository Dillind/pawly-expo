import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import FeatureRequestTags from '@/components/ui/feature-request-tags';
import FeatureRequestVoteButton from '@/components/ui/feature-request-vote-button';
import { FEATURE_REQUEST_STATUS_OPTIONS } from '@/constants/options';
import type { AppTheme } from '@/constants/theme';
import {
  featureRequestPermissions,
  useFeatureRequestActions
} from '@/hooks/use-feature-request-actions';
import { useStyles } from '@/hooks/use-styles';
import type { FeatureRequest } from '@/services/feature-request.service';

type Props = {
  request: FeatureRequest;
  isTeam: boolean;
  isBanned: boolean;
  isReviewing?: boolean;
};

const FeatureRequestCard = ({ request, isTeam, isBanned, isReviewing = false }: Props) => {
  const styles = useStyles(makeStyles);
  const actions = useFeatureRequestActions();
  const can = featureRequestPermissions(request, { isTeam, isBanned });

  return (
    <Link
      href={{
        pathname: '/profile/settings/feature-requests/[requestId]',
        params: { requestId: request.id }
      }}
      asChild>
      <Link.Trigger>
        <Pressable
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={`${request.title}, ${request.voteCount} ${request.voteCount === 1 ? 'vote' : 'votes'}`}
          accessibilityHint="Opens the request. Touch and hold for more actions."
          accessibilityActions={
            can.canVote
              ? [{ name: 'vote', label: request.hasVoted ? 'Remove vote' : 'Upvote' }]
              : []
          }
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'vote') actions.toggleVote(request);
          }}>
          <View style={styles.body}>
            <AppText variant="header" size={17} fontWeight="semibold" numberOfLines={2}>
              {request.title}
            </AppText>
            {request.description ? (
              <AppText size={14} color="textSecondary" numberOfLines={2} style={styles.lead}>
                {request.description}
              </AppText>
            ) : null}
            <FeatureRequestTags request={request} isReviewing={isReviewing} />
          </View>
          <FeatureRequestVoteButton
            count={request.voteCount}
            hasVoted={request.hasVoted}
            isDisabled={!can.canVote}
            onPress={() => actions.toggleVote(request)}
          />
        </Pressable>
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction
          title="Report"
          icon="flag"
          destructive
          hidden={!can.canReport}
          onPress={() => actions.report(request)}
        />
        <Link.MenuAction
          title="Hide requests from this person"
          icon="eye.slash"
          hidden={!can.canHideAuthor}
          onPress={() => actions.hideAuthor(request)}
        />
        <Link.MenuAction
          title="Delete"
          icon="trash"
          destructive
          hidden={!can.canDeleteOwn}
          onPress={() => actions.confirmDelete(request)}
        />
        {can.canModerate ? (
          <Link.Menu title="Crumpet team" inline>
            <Link.Menu title="Set status" icon="tag">
              {FEATURE_REQUEST_STATUS_OPTIONS.map((option) => (
                <Link.MenuAction
                  key={option.value}
                  title={option.label}
                  isOn={request.status === option.value}
                  onPress={() => actions.setStatus(request, option.value)}
                />
              ))}
            </Link.Menu>
            <Link.MenuAction
              title="Restore"
              icon="arrow.uturn.backward"
              hidden={!can.canRestore}
              onPress={() => actions.restore(request)}
            />
            <Link.MenuAction
              title="Delete request"
              icon="trash"
              destructive
              hidden={!can.canDeleteAsTeam}
              onPress={() => actions.confirmDelete(request)}
            />
          </Link.Menu>
        ) : null}
      </Link.Menu>
    </Link>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      padding: spacing.three,
      borderRadius: 18,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement
    },
    body: {
      flex: 1,
      gap: 6
    },
    lead: {
      lineHeight: 20
    }
  });

export default FeatureRequestCard;

import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import { FEATURE_REQUEST_STATUS_OPTIONS } from '@/constants/options';
import { Radius, type AppTheme, type ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import type { FeatureRequest, FeatureRequestStatus } from '@/services/feature-request.service';
import { optionLabel } from '@/utils/options';

const STATUS_COLORS: Record<FeatureRequestStatus, { fill: ThemeColor; ink: ThemeColor }> = {
  open: { fill: 'backgroundSelected', ink: 'textSecondary' },
  planned: { fill: 'vetMuted', ink: 'vet' },
  in_progress: { fill: 'medicationMuted', ink: 'medication' },
  done: { fill: 'successMuted', ink: 'success' },
  declined: { fill: 'backgroundSelected', ink: 'textSecondary' }
};

const Pill = ({ label, fill, ink }: { label: string; fill: ThemeColor; ink: ThemeColor }) => {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.pill, { backgroundColor: colors[fill] }]}>
      <AppText size="caption" fontWeight="semibold" color={ink} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
};

type Props = {
  request: FeatureRequest;
  isReviewing?: boolean;
};

const FeatureRequestTags = ({ request, isReviewing = false }: Props) => {
  const styles = useStyles(makeStyles);
  const { fill, ink } = STATUS_COLORS[request.status];

  return (
    <View style={styles.row}>
      {isReviewing ? (
        request.isHidden ? (
          <Pill label="Hidden" fill="errorMuted" ink="error" />
        ) : (
          <Pill label="Visible" fill="backgroundSelected" ink="textSecondary" />
        )
      ) : request.isHidden ? (
        <Pill label="Under review" fill="errorMuted" ink="error" />
      ) : (
        <Pill
          label={optionLabel(FEATURE_REQUEST_STATUS_OPTIONS, request.status) ?? ''}
          fill={fill}
          ink={ink}
        />
      )}
      {request.isTeamPost ? (
        <View style={styles.team}>
          <AppText
            size="captionSmall"
            fontWeight="semibold"
            color="textSecondary"
            numberOfLines={1}>
            Crumpet team
          </AppText>
        </View>
      ) : null}
      {request.reportCount > 0 ? (
        <AppText size="footnote" color="textSecondary">
          {request.reportCount === 1 ? '1 report' : `${request.reportCount} reports`}
        </AppText>
      ) : null}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.one + spacing.half
    },
    pill: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: Radius.full
    },
    team: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border
    }
  });

export default FeatureRequestTags;

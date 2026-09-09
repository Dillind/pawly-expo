import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import HouseholdCrest from '@/components/core/household-crest';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import SettingsSection from '@/components/core/settings-section';
import ScrollScreen from '@/components/layout/scroll-screen';
import { BottomTabInset, Spacing, type AppTheme } from '@/constants/theme';
import { useFollowing } from '@/hooks/queries/follow/use-follows';
import { useStyles } from '@/hooks/use-styles';
import { countText } from '@/utils/counts';

const CREST = 36;

/**
 * The households the viewer follows, a request still waiting included. A
 * pending row names the household but offers nothing: the read has not opened
 * yet, and the row is there so the person knows they asked.
 */
const FollowingList = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: following = [], isLoading, isError, refetch } = useFollowing();

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (isError) {
      return <ErrorState title="Couldn't load who you follow" onRetry={() => void refetch()} />;
    }

    return following.length === 0 ? (
      <EmptyState
        icon="users"
        title="You follow nobody yet"
        description="Someone has to send you their follow link. There is no search — every household here is private."
      />
    ) : (
      <SettingsSection
        title="Households you follow"
        dividerInset={Spacing.three + CREST + Spacing.three}>
        {following.map((household) => (
          <PressableOpacity
            key={household.householdId}
            accessibilityRole="button"
            accessibilityLabel={`Open ${household.name}`}
            onPress={() =>
              router.push({
                pathname: '/follow/[householdId]',
                params: { householdId: household.householdId }
              })
            }>
            <View style={styles.row}>
              <HouseholdCrest size={CREST} iconSize={18} />
              <View style={styles.rowText}>
                <AppText size={16} numberOfLines={1}>
                  {household.name}
                </AppText>
                <AppText size={13} color="textSecondary">
                  {household.status === 'pending'
                    ? 'Waiting to be accepted'
                    : countText(household.petCount, 'pet')}
                </AppText>
              </View>
              {household.status === 'accepted' && (
                <Icon name="caretRight" size={16} color="textSecondary" />
              )}
            </View>
          </PressableOpacity>
        ))}
      </SettingsSection>
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: 56,
      paddingHorizontal: spacing.three
    },
    rowText: {
      flex: 1,
      gap: spacing.half
    }
  });

export default FollowingList;

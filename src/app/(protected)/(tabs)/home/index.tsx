import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import ScreenView from '@/components/layout/screen-view';
import ActionPopover from '@/components/ui/action-popover';
import { CREATE_ACTIONS } from '@/components/ui/create-actions';
import SlotRow from '@/components/ui/slot-row';
import type { AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/use-household';
import { memberDisplayName, useHouseholdMembers } from '@/hooks/use-household-members';
import { usePet } from '@/hooks/use-pet';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useSlotStates } from '@/hooks/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { useLogFeed } from '@/hooks/use-feed-log-mutations';
import { todayInTimezone } from '@/lib/dates';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

const Home = () => {
  const styles = useStyles(makeStyles);

  const { data: household } = useHousehold();
  const { data: pet } = usePet();
  const { data: members = [] } = useHouseholdMembers();

  const timezone = household?.timezone;
  const today = timezone ? todayInTimezone(timezone) : undefined;

  const {
    data: slots,
    isLoading,
    isError,
    refetch
  } = useSlotStates(pet?.id, today, { live: true });

  useRefreshOnFocus(['slot-states', pet?.id]);

  const logFeed = useLogFeed(pet?.id);

  return (
    <ScreenView>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="header" size={32}>
          {pet?.name ?? ' '}
        </AppText>

        <AppText size={16} color="textSecondary">
          Today
        </AppText>

        {isError ? (
          <ErrorState
            onRetry={() => {
              void refetch();
            }}
          />
        ) : isLoading || !timezone ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.slots}>
            {slots?.map((slot) => (
              <SlotRow
                key={slot.scheduleId}
                slot={slot}
                timezone={timezone}
                fedBy={memberDisplayName(members, slot.satisfiedBy)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ActionPopover
        actions={CREATE_ACTIONS}
        primaryAction={{
          label: 'Log a feed',
          isDisabled: !pet?.id || logFeed.isPending,
          onPress: () => {
            logFeed.mutate(
              {},
              {
                onSuccess: () => toast.success(`Logged a feed for ${pet?.name ?? 'your pet'}`),
                onError: () => toast.error('Could not log that feed. Try again.')
              }
            );
          }
        }}
      />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingVertical: spacing.four,
      gap: spacing.three
    },
    slots: {
      gap: spacing.two
    }
  });

export default Home;

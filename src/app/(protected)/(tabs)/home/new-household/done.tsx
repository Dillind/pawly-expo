import { useRouter } from 'expo-router';
import { useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import ScreenFooter from '@/components/layout/screen-footer';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import type { NewHouseholdFormValues } from '@/constants/schemas/new-household';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useStyles } from '@/hooks/use-styles';

const Done = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { control, reset } = useFormContext<NewHouseholdFormValues>();
  const { data: household } = useHousehold();

  const name = useWatch({ control, name: 'name' });
  const handle = useWatch({ control, name: 'handle' });
  const isListed = useWatch({ control, name: 'isListed' });
  const petName = useWatch({ control, name: 'petName' });
  const feedTimes = useWatch({ control, name: 'feedTimes' });

  // No close button and no back: the household exists, so there is nothing
  // left to abandon and nothing left to change from here.
  const leave = () => {
    reset();

    if (router.canDismiss()) router.dismissAll();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
  };

  const invite = () => {
    if (!household) return leave();

    reset();
    router.dismissTo(`/home/household/${household.id}/invite`);
  };

  const rows = [
    { label: 'Handle', value: `@${handle}` },
    { label: 'Discovery', value: isListed ? 'Listed' : 'Unlisted' },
    { label: 'Pet', value: petName },
    { label: 'Feed times', value: `${feedTimes.length} a day` },
    { label: 'Timezone', value: household?.timezone ?? '' }
  ];

  return (
    <ScreenView>
      <View style={styles.head}>
        <AppText variant="header" size="title1" fontWeight="bold">
          {name}
        </AppText>
        <AppText size="subhead" color="textSecondary" style={styles.subtitle}>
          {petName} is set up. Log the first feed whenever you like.
        </AppText>
      </View>

      <ScreenScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          {rows.map((row, index) => (
            <View key={row.label} style={[styles.row, index > 0 && styles.rowDivided]}>
              <AppText size="subhead" color="textSecondary">
                {row.label}
              </AppText>
              <AppText size="subhead" fontWeight="semibold">
                {row.value}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.invite}>
          <AppText variant="header" size="title3" fontWeight="bold">
            Invite the rest of the house
          </AppText>
          <AppText size="footnote" color="textSecondary">
            They see {petName}&apos;s feed times, and everyone is told when someone feeds.
          </AppText>
        </View>
      </ScreenScrollView>

      <ScreenFooter>
        <MainButton text="Invite someone" onPress={invite} />
        <MainButton text="Not now" variant="secondary" onPress={leave} />
      </ScreenFooter>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    head: {
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.four - spacing.one
    },
    subtitle: {
      marginTop: spacing.two
    },
    content: {
      gap: spacing.four - spacing.one,
      paddingBottom: spacing.five
    },
    summary: {
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement,
      overflow: 'hidden'
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.three,
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.two + spacing.one
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border
    },
    invite: {
      gap: spacing.one + 1
    }
  });

export default Done;

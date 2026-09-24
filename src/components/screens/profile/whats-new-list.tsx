import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { RELEASES, type ReleaseNote } from '@/constants/release-notes';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useWhatsNew } from '@/hooks/use-whats-new';
import { formatReleaseDate } from '@/lib/whats-new';
import { isNewerVersion } from '@/utils/version';

const WhatsNewList = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { lastSeenVersion, markSeen } = useWhatsNew();

  // Captured before markSeen moves it, so the badges survive the visit.
  const [seenAtOpen] = useState(lastSeenVersion);

  useEffect(() => {
    void markSeen();
  }, [markSeen]);

  const openRequest = (requestId: string) =>
    router.push({
      pathname: '/profile/settings/feature-requests/[requestId]',
      params: { requestId }
    });

  const renderNote = (note: ReleaseNote) => (
    <View key={note.title} style={styles.note}>
      <View style={[styles.tile, note.isHighlighted && styles.tileHighlighted]}>
        <Icon
          name={note.icon}
          size={IconSize.control}
          color={note.isHighlighted ? 'primaryText' : 'textSecondary'}
        />
      </View>
      <View style={styles.noteText}>
        <AppText size="callout" fontWeight="semibold">
          {note.title}
        </AppText>
        {note.isHighlighted && note.description && (
          <AppText size="subhead" color="textSecondary">
            {note.description}
          </AppText>
        )}
        {note.featureRequestId && (
          <PressableOpacity
            accessibilityRole="link"
            onPress={() => note.featureRequestId && openRequest(note.featureRequestId)}
            hitSlop={8}
            style={styles.tag}>
            <Icon name="lightbulb" size={IconSize.inline} color="primaryText" />
            <AppText size="caption" fontWeight="semibold" color="primaryText">
              Requested on the feedback board
            </AppText>
          </PressableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {RELEASES.map((release) => (
          <View key={release.version} style={styles.release}>
            <View style={styles.releaseHeader}>
              <AppText variant="header" size="titleSmall" fontWeight="bold">
                {release.version}
              </AppText>
              {isNewerVersion(release.version, seenAtOpen) && (
                <View style={styles.newBadge}>
                  <AppText size="caption" fontWeight="bold" color="onPrimary">
                    New
                  </AppText>
                </View>
              )}
              <AppText size="footnote" color="textSecondary" style={styles.date}>
                {formatReleaseDate(release.date)}
              </AppText>
            </View>
            <View style={styles.card}>{release.notes.map(renderNote)}</View>
          </View>
        ))}
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      padding: spacing.three,
      gap: spacing.four
    },
    release: {
      gap: spacing.two
    },
    releaseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    newBadge: {
      paddingHorizontal: spacing.two,
      paddingVertical: spacing.half,
      borderRadius: Radius.full,
      backgroundColor: colors.primary
    },
    date: {
      marginLeft: 'auto'
    },
    card: {
      borderRadius: Radius.row,
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: spacing.one
    },
    note: {
      flexDirection: 'row',
      gap: spacing.three,
      padding: spacing.three
    },
    tile: {
      width: 32,
      height: 32,
      borderRadius: Radius.control,
      backgroundColor: colors.backgroundSelected,
      alignItems: 'center',
      justifyContent: 'center'
    },
    tileHighlighted: {
      backgroundColor: colors.primaryMuted
    },
    noteText: {
      flex: 1,
      gap: spacing.half
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.one,
      marginTop: spacing.one,
      paddingHorizontal: spacing.two,
      paddingVertical: spacing.one,
      borderRadius: Radius.full,
      backgroundColor: colors.primaryMuted
    }
  });

export default WhatsNewList;

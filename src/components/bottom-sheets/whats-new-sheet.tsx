import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import type { ReleaseNote } from '@/constants/release-notes';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  version: string;
  notes: ReleaseNote[];
  onDismiss: () => void;
  onSeeAll: () => void;
};

const WhatsNewSheet = ({ sheetRef, version, notes, onDismiss, onSeeAll }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet
      sheetRef={sheetRef}
      title="What’s New in Crumpet"
      detents={['auto']}
      onDismiss={onDismiss}>
      <AppText size="footnote" color="textSecondary">
        Version {version}
      </AppText>

      <View style={styles.notes}>
        {notes.map((note) => (
          <View
            key={note.title}
            style={styles.note}
            accessible
            accessibilityLabel={[
              note.title,
              note.description,
              note.featureRequestId && 'requested on the feedback board'
            ]
              .filter(Boolean)
              .join(', ')}>
            <View style={styles.tile}>
              <Icon name={note.icon} size={IconSize.action} color="primaryText" />
              {note.featureRequestId && (
                <View style={styles.requested}>
                  <Icon name="lightbulb" size={11} color="onPrimary" />
                </View>
              )}
            </View>
            <View style={styles.text}>
              <AppText size="body" fontWeight="semibold">
                {note.title}
              </AppText>
              {note.description && (
                <AppText size="subhead" color="textSecondary">
                  {note.description}
                </AppText>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <MainButton text="Continue" onPress={() => void sheetRef.current?.dismiss()} />
        <MainButton text="See all changes" variant="text" onPress={onSeeAll} />
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    notes: {
      gap: spacing.four,
      paddingVertical: spacing.two
    },
    note: {
      flexDirection: 'row',
      gap: spacing.three
    },
    tile: {
      width: 44,
      height: 44,
      borderRadius: Radius.panel,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center'
    },
    requested: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: Radius.full,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.backgroundSheet,
      alignItems: 'center',
      justifyContent: 'center'
    },
    text: {
      flex: 1,
      gap: spacing.half
    },
    actions: {
      gap: spacing.one
    }
  });

export default WhatsNewSheet;

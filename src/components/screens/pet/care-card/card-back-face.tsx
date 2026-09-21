import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { CardInset, CardPalette, CardRadius } from '@/constants/care-card-palette';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardBackRow } from '@/lib/care-card-view';

type Props = {
  petName: string;
  updatedLabel: string | null;
  rows: CareCardBackRow[];
  isOwner: boolean;
  isSharing: boolean;
  onHelp: () => void;
  onShare: () => void;
  onFlip: () => void;
  onOpenSection: (sectionId: string) => void;
};

const SectionRow = ({
  row,
  isOwner,
  onPress
}: {
  row: CareCardBackRow;
  isOwner: boolean;
  onPress: () => void;
}) => {
  const styles = useStyles(makeStyles);

  const body = (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText size={16} fontWeight="semibold" style={styles.ink}>
          {row.title}
        </AppText>
        <AppText size={13} numberOfLines={2} ellipsizeMode="tail" style={styles.inkQuiet}>
          {row.summary ?? 'Nothing here yet'}
        </AppText>
      </View>

      {isOwner && <Icon name="caretRight" size={18} color="onPrimary" />}
    </View>
  );

  if (!isOwner) return body;

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Edit ${row.title}`}
      onPress={onPress}>
      {body}
    </PressableOpacity>
  );
};

const CardBackFace = ({
  petName,
  updatedLabel,
  rows,
  isOwner,
  isSharing,
  onHelp,
  onShare,
  onFlip,
  onOpenSection
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.face}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="header" size={20} numberOfLines={1} style={styles.ink}>
            {`${petName}'s care card`}
          </AppText>
          {updatedLabel && (
            <AppText size={12} style={styles.inkQuiet}>
              {updatedLabel}
            </AppText>
          )}
        </View>

        <IconButton
          name="help"
          accessibilityLabel="What is a Care Card?"
          variant="ghost"
          color="onPrimary"
          size={20}
          containerStyle={styles.action}
          onPress={onHelp}
        />
        <IconButton
          name="share"
          accessibilityLabel="Share the Care Card"
          variant="ghost"
          color="onPrimary"
          size={20}
          isLoading={isSharing}
          containerStyle={styles.action}
          onPress={onShare}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {rows.map((row, index) => (
          <Fragment key={row.id}>
            {index > 0 && <View style={styles.rule} />}
            <SectionRow row={row} isOwner={isOwner} onPress={() => onOpenSection(row.id)} />
          </Fragment>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <IconButton
          name="flip"
          accessibilityLabel="Turn the card back over"
          variant="ghost"
          color="onPrimary"
          size={22}
          hapticFeedback={false}
          containerStyle={styles.action}
          onPress={onFlip}
        />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    face: {
      flex: 1,
      paddingVertical: CardInset,
      borderRadius: CardRadius,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: CardPalette.cream
    },
    ink: {
      color: CardPalette.onCream
    },
    inkQuiet: {
      color: CardPalette.onCreamSecondary
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      paddingHorizontal: CardInset,
      paddingBottom: spacing.three
    },
    headerText: {
      flex: 1,
      gap: 1
    },
    action: {
      minWidth: 40,
      minHeight: 40
    },
    list: {
      flex: 1
    },
    listContent: {
      paddingBottom: spacing.three
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.three,
      paddingHorizontal: CardInset
    },
    rowText: {
      flex: 1,
      gap: spacing.half
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      marginLeft: CardInset,
      backgroundColor: CardPalette.rule
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: CardInset,
      paddingTop: spacing.two
    }
  });

export default CardBackFace;

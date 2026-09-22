import { LinearGradient } from 'expo-linear-gradient';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import CardRim from '@/components/screens/pet/care-card/card-rim';
import CardSweep from '@/components/screens/pet/care-card/card-sweep';
import {
  CardFaceRadius,
  CardFlipBottom,
  CardFlipInset,
  CardGradientEnd,
  CardGradientStart,
  CardInset,
  CardPalette
} from '@/constants/care-card-palette';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardBackRow } from '@/lib/care-card-view';

type Props = {
  petName: string;
  updatedLabel: string | null;
  rows: CareCardBackRow[];
  isOwner: boolean;
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

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${isOwner ? 'Edit' : 'Read'} ${row.title}`}
      onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <AppText size="body" fontWeight="semibold" style={styles.ink}>
            {row.title}
          </AppText>
          <AppText size="footnote" numberOfLines={2} ellipsizeMode="tail" style={styles.inkQuiet}>
            {row.summary ?? 'Nothing here yet'}
          </AppText>
        </View>

        <Icon name="caretRight" size={IconSize.control} color="textSecondary" />
      </View>
    </PressableOpacity>
  );
};

const CardBackFace = ({ petName, updatedLabel, rows, isOwner, onFlip, onOpenSection }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <CardRim>
      <LinearGradient
        colors={CardPalette.paperStops}
        start={CardGradientStart}
        end={CardGradientEnd}
        style={styles.face}>
        <CardSweep face="back" fill={CardPalette.paperSweep} />

        <View style={styles.header}>
          <AppText variant="header" size={20} numberOfLines={1} style={styles.ink}>
            {`${petName}'s care card`}
          </AppText>
          {updatedLabel && (
            <AppText size="caption" style={styles.inkQuiet}>
              {updatedLabel}
            </AppText>
          )}
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

        <IconButton
          name="turnOver"
          accessibilityLabel="Turn the card back over"
          variant="ghost"
          color="onPrimary"
          size={IconSize.control}
          hapticFeedback={false}
          containerStyle={styles.flip}
          onPress={onFlip}
        />
      </LinearGradient>
    </CardRim>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    face: {
      flex: 1,
      paddingVertical: CardInset,
      borderRadius: CardFaceRadius,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    ink: {
      color: CardPalette.onPaper
    },
    inkQuiet: {
      color: CardPalette.onPaperSecondary
    },
    header: {
      gap: 1,
      paddingHorizontal: CardInset,
      paddingBottom: spacing.three
    },
    // The list stops above the corner, so no row runs under the flip control.
    list: {
      flex: 1,
      marginBottom: CardFlipBottom + 44 - CardInset + spacing.two
    },
    listContent: {
      paddingBottom: spacing.two
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
    flip: {
      position: 'absolute',
      left: CardFlipInset,
      bottom: CardFlipBottom,
      width: 44,
      height: 44,
      minWidth: 44,
      minHeight: 44
    }
  });

export default CardBackFace;

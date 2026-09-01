import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import IconButton from '@/components/core/icon-button';
import BaseModal from '@/components/modals/base-modal';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useStyles } from '@/hooks/use-styles';
import { careCardBlocks } from '@/lib/care-card-view';
import { formatDateWithYear } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import type { CareCard, CareCardContact, Medication } from '@/services/care-card.service';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import type { TileFrame } from './care-card-tile';
import CareCardSections from './care-card-sections';

const MORPH_DURATION_MS = 380;

type Props = {
  petName: string;
  card: CareCard;
  medications: Medication[];
  contacts: CareCardContact[];
  /** Window coordinates of the tile this grows out of. */
  origin: TileFrame;
  isSharing: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onShare: () => void;
  onHelp: () => void;
};

/**
 * The care card as a page, grown out of its tile.
 *
 * It is the page colour rather than a gold card, and it does not flip: a sitter
 * reading this wants every section at once, and a face they have to turn over
 * hid half of them behind an animation.
 */
const CareCardOverlay = ({
  petName,
  card,
  medications,
  contacts,
  origin,
  isSharing,
  onClose,
  onEdit,
  onShare,
  onHelp
}: Props) => {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const { data: household } = useHousehold();

  const progress = useSharedValue(0);
  const duration = isReducedMotion ? 0 : MORPH_DURATION_MS;

  const close = () => {
    void hapticLight();
    progress.value = withTiming(0, { duration }, (isFinished) => {
      if (isFinished) runOnJS(onClose)();
    });
  };

  useEffect(() => {
    progress.value = withTiming(1, { duration });
  }, [duration, progress]);

  const pageStyle = useAnimatedStyle(() => ({
    left: interpolate(progress.value, [0, 1], [origin.x, 0]),
    top: interpolate(progress.value, [0, 1], [origin.y, 0]),
    width: interpolate(progress.value, [0, 1], [origin.width, windowWidth]),
    height: interpolate(progress.value, [0, 1], [origin.height, windowHeight]),
    borderRadius: interpolate(progress.value, [0, 1], [Radius.tile, 0])
  }));

  // Held back until the page is nearly full size: text scaled up from tile
  // width reads as a smear.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1], Extrapolation.CLAMP)
  }));

  const blocks = careCardBlocks(card, medications, contacts);

  return (
    // Unanimated: the morph below is the animation. The modal still supplies
    // the backdrop and the hardware back button.
    <BaseModal isVisible variant="bare" hasAnimation={false} onClose={close}>
      <Animated.View style={[styles.page, pageStyle]}>
        <Animated.View style={[styles.content, contentStyle]}>
          <Animated.View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
            <IconButton
              name="close"
              accessibilityLabel="Close the Care Card"
              variant="secondary"
              size={22}
              onPress={close}
            />

            <Animated.View style={styles.barActions}>
              <IconButton
                name="help"
                accessibilityLabel="What is a Care Card?"
                variant="ghost"
                size={20}
                onPress={onHelp}
              />
              <IconButton
                name="share"
                accessibilityLabel="Share the Care Card"
                variant="secondary"
                size={20}
                isLoading={isSharing}
                isDisabled={isSharing || blocks.length === 0}
                onPress={onShare}
              />
              {onEdit && (
                <IconButton
                  name="pencil"
                  accessibilityLabel="Edit the Care Card"
                  variant="secondary"
                  size={20}
                  onPress={onEdit}
                />
              )}
            </Animated.View>
          </Animated.View>

          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}>
            <Animated.View style={styles.heading}>
              <AppText variant="header" size={30} fontWeight="bold">
                {`${petName}'s care card`}
              </AppText>
              {card.updatedAt && household?.timezone && (
                <AppText size={13} color="textSecondary">
                  {`Updated ${formatDateWithYear(new Date(card.updatedAt), household.timezone)}`}
                </AppText>
              )}
            </Animated.View>

            {blocks.length > 0 ? (
              <CareCardSections blocks={blocks} />
            ) : (
              <EmptyState
                icon="clipboardList"
                title="Nothing on the card yet"
                description={`Add what a sitter needs to know about ${petName}, and it is here whenever they open it.`}
              />
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </BaseModal>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    page: {
      position: 'absolute',
      backgroundColor: colors.background,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    content: { flex: 1 },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.three
    },
    barActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.one },
    scroll: {
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.two,
      gap: spacing.four
    },
    heading: { gap: spacing.half }
  });

export default CareCardOverlay;

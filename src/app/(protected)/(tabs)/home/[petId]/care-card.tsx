import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import CareCardHelpSheets, {
  type CareCardHelpHandle
} from '@/components/screens/pet/care-card/care-card-help-sheets';
import CareCardSections from '@/components/screens/pet/care-card/care-card-sections';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useCareCardData } from '@/hooks/queries/pet/use-care-card';
import { useShareCareCard } from '@/hooks/use-share-care-card';
import { useStyles } from '@/hooks/use-styles';
import { careCardBlocks } from '@/lib/care-card-view';
import { formatDateWithYear } from '@/lib/dates';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

/**
 * The care card as a screen of its own, which is what a handover document is:
 * a sitter opens it, reads every section, and hands the phone back.
 */
const CareCardScreen = () => {
  const { petId, petName, petSubtitle } = useLocalSearchParams<{
    petId: string;
    petName: string;
    petSubtitle?: string;
  }>();
  const router = useRouter();
  const styles = useStyles(makeStyles);
  const helpRef = useRef<CareCardHelpHandle | null>(null);

  const { card, medications, contacts, isLoading } = useCareCardData(petId);
  const { shareCareCard, isSharing } = useShareCareCard();
  const { data: household } = useHousehold();

  const blocks = careCardBlocks(card, medications, contacts);
  const isOwner = household?.isOwner ?? false;

  return (
    <ScreenView edges={[]}>
      {/* The large title IS the page's heading -- drawing both put the same
          words on the screen twice. */}
      <Stack.Title large>{`${petName}'s care card`}</Stack.Title>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="questionmark.circle"
          accessibilityLabel="What is a Care Card?"
          onPress={() => helpRef.current?.openWhatIsIt()}
        />
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          accessibilityLabel="Share the Care Card"
          disabled={isSharing || blocks.length === 0}
          onPress={() => void shareCareCard([petId])}
        />
        {/* A view rather than a Button, because the pencil is Lucide's: it is
            the same glyph the Feed times and About headers draw, and an SF
            Symbol beside them made one screen use two pencils.

            `hidden` rather than a conditional child: the toolbar reads its
            children once, so removing one leaves a gap where the item was. */}
        <Stack.Toolbar.View hidden={!isOwner}>
          <PressableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit the Care Card"
            hitSlop={12}
            onPress={() =>
              router.push({
                pathname: '/home/[petId]/care-card-editor',
                params: { petId, petName, ...(petSubtitle ? { petSubtitle } : {}) }
              })
            }>
            <Icon name="pencil" size={20} />
          </PressableOpacity>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {card.updatedAt && household?.timezone && (
          <AppText size={13} color="textSecondary">
            {`Updated ${formatDateWithYear(new Date(card.updatedAt), household.timezone)}`}
          </AppText>
        )}

        {isLoading ? (
          <ActivityIndicator />
        ) : blocks.length > 0 ? (
          <CareCardSections blocks={blocks} />
        ) : (
          <EmptyState
            icon="clipboardList"
            title="Nothing on the card yet"
            description={`Add what a sitter needs to know about ${petName}, and it is here whenever they open it.`}
          />
        )}
      </ScreenScrollView>

      <CareCardHelpSheets ref={helpRef} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      gap: spacing.three,
      paddingBottom: BottomTabInset + spacing.four
    }
  });

export default CareCardScreen;

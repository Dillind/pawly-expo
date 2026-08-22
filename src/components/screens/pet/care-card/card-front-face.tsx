import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import CardActionButton from './card-action-button';
import CardFaceHeader from './card-face-header';
import { CARD_WASH } from './wash';

type Props = {
  petName: string;
  petSubtitle: string | null;
  photoUrl: string | null;
  summary: string | null;
  isSharing: boolean;
  isShareDisabled: boolean;
  onFlip: () => void;
  /** Omitted for a member who cannot edit the card, which hides the control. */
  onEdit?: () => void;
  onShare: () => void;
  onHelp: () => void;
};

const CardFrontFace = ({
  petName,
  petSubtitle,
  photoUrl,
  summary,
  isSharing,
  isShareDisabled,
  onFlip,
  onEdit,
  onShare,
  onHelp
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <>
      <CardFaceHeader
        eyebrow="Care Card"
        action={
          <IconButton
            name="help"
            accessibilityLabel="What is a Care Card?"
            variant="ghost"
            color="onPrimary"
            size={18}
            containerStyle={styles.wash}
            onPress={onHelp}
          />
        }
      />

      <View style={styles.identity}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Icon name="pawPrint" size={44} color="onPrimary" />
          </View>
        )}

        <View style={styles.identityText}>
          <AppText variant="header" size={28} color="onPrimary" align="center">
            {petName}
          </AppText>
          {petSubtitle && (
            <AppText size={14} color="onPrimary" align="center" style={styles.muted}>
              {petSubtitle}
            </AppText>
          )}
        </View>
      </View>

      {summary ? (
        <View style={styles.footer}>
          <PressableOpacity
            style={styles.seeEverything}
            accessibilityRole="button"
            accessibilityLabel={`See everything on ${petName}'s Care Card`}
            onPress={onFlip}>
            <AppText color="onPrimary" size={13} style={styles.muted}>
              {summary}
            </AppText>
            <View style={styles.seeEverythingLabel}>
              <AppText color="onPrimary" size={13}>
                See everything
              </AppText>
              <Icon name="caretRight" size={14} color="onPrimary" />
            </View>
          </PressableOpacity>

          <View style={styles.actions}>
            {onEdit && (
              <CardActionButton
                text="Edit"
                accessibilityLabel={`Edit ${petName}'s Care Card`}
                variant="ghost"
                onPress={onEdit}
              />
            )}
            <CardActionButton
              text="Share"
              accessibilityLabel={`Share ${petName}'s Care Card`}
              variant="solid"
              icon="share"
              isLoading={isSharing}
              isDisabled={isShareDisabled}
              onPress={onShare}
            />
          </View>
        </View>
      ) : (
        <View style={styles.footer}>
          <AppText color="onPrimary" size={13} align="center" style={styles.muted}>
            Everything a sitter needs to look after {petName}, on one card you can hand over.
          </AppText>

          {onEdit && (
            <View style={styles.actions}>
              <CardActionButton
                text="Get started"
                accessibilityLabel={`Start ${petName}'s Care Card`}
                variant="solid"
                fontWeight="bold"
                onPress={onEdit}
              />
            </View>
          )}
        </View>
      )}
    </>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    wash: { backgroundColor: CARD_WASH },
    muted: { opacity: 0.8 },
    identity: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.three },
    photo: { width: 132, height: 132, borderRadius: Radius.full },
    photoFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: CARD_WASH
    },
    identityText: { gap: spacing.half, alignItems: 'center' },
    footer: { gap: spacing.three },
    seeEverything: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.two
    },
    seeEverythingLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.one },
    actions: { flexDirection: 'row', gap: spacing.two }
  });

export default CardFrontFace;

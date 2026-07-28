import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import ActionPopoverItem, { type ActionPopoverAction } from '@/components/ui/action-popover-item';
import { IconName } from '@/constants/icon-map';
import { BottomTabInset, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { createShadowMedium } from '@/lib/styles/shadows';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * Distance the glass surfaces merge across -- drives the fuse-on-open morph.
 *
 * This value alone is not sufficient: measured on iOS 26, the surfaces only
 * grow the connecting neck when the *laid-out gap between them* is small too
 * (8pt fuses, 16pt does not), regardless of what is passed here. Both numbers
 * matter, so don't raise the container's `gap` without re-checking on device.
 */
const GLASS_MERGE_SPACING = 24;

const FAB_SIZE = 56;

type PrimaryAction = {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  icon?: IconName;
};

type Props = {
  /** Secondary rows, rendered above the primary action. */
  actions: ActionPopoverAction[];
  /**
   * The single emphasised action. Separate from `actions` so "there is exactly
   * one primary" is enforced by the type rather than by convention.
   */
  primaryAction: PrimaryAction;
  accessibilityLabel?: string;
};

/**
 * A floating glass action menu anchored to its own trigger button.
 *
 * This is a popover, not a sheet: it is drawn in-app and anchored to the
 * control that opened it, and never touches TrueSheet (see ADR 0010 for what
 * "sheet" means here). Both surfaces live inside one GlassContainer so the
 * material fuses as the bubble grows out of the trigger -- which is why the
 * trigger is owned by this component and is not independently placeable.
 */
const ActionPopover = ({ actions, primaryAction, accessibilityLabel = 'Create' }: Props) => {
  const styles = useStyles(makeStyles);
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  const runPrimary = () => {
    close();
    // Presented after dismissal rather than alongside it: a native sheet
    // presented while this overlay is still up gets swallowed by iOS.
    requestAnimationFrame(primaryAction.onPress);
  };

  return (
    <>
      {isOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={styles.anchor} pointerEvents="box-none">
        <GlassContainer spacing={GLASS_MERGE_SPACING} style={styles.container}>
          {isOpen ? (
            <GlassView
              glassEffectStyle={{ style: 'regular', animate: true, animationDuration: 0.25 }}
              style={styles.bubble}
              accessibilityViewIsModal>
              {actions.map((action) => (
                <ActionPopoverItem key={action.title} {...action} />
              ))}

              <MainButton
                text={primaryAction.label}
                size="sm"
                leftIcon={
                  primaryAction.icon ? (
                    <Icon name={primaryAction.icon} color="onPrimary" />
                  ) : undefined
                }
                isDisabled={primaryAction.isDisabled}
                onPress={runPrimary}
              />
            </GlassView>
          ) : null}

          <IconButton
            variant="glass"
            name={isOpen ? 'close' : 'plus'}
            size={28}
            accessibilityLabel={isOpen ? 'Close menu' : accessibilityLabel}
            containerStyle={styles.trigger}
            onPress={() => setIsOpen((open) => !open)}
          />
        </GlassContainer>
      </View>
    </>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    anchor: {
      position: 'absolute',
      right: spacing.four,
      // The native tab bar cannot report its height (expo-router's native tabs
      // expose no such hook), so this offset is only correct while the bar is a
      // fixed height -- which is why `minimizeBehavior` is off in app-tabs.
      bottom: BottomTabInset + spacing.three,
      left: spacing.four
    },
    container: {
      alignItems: 'flex-end',
      gap: spacing.two
    },
    bubble: {
      width: '100%',
      padding: spacing.three,
      gap: spacing.two,
      borderRadius: Radius.card,
      overflow: 'hidden',
      // Below iOS 26 GlassView renders as a transparent View, leaving the rows
      // floating unbacked over the screen. The solid card is the fallback.
      ...(isLiquidGlassAvailable()
        ? null
        : { backgroundColor: colors.backgroundElement, ...createShadowMedium(colors) })
    },
    trigger: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      // IconButton defaults to alignSelf: 'center', which would otherwise win
      // over the container's alignItems and centre the FAB horizontally.
      alignSelf: 'flex-end'
    }
  });

export default ActionPopover;

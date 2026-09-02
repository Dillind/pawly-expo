import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { ActionMenuProps } from './action-menu.types';

/**
 * The non-iOS fallback. iOS gets `action-menu.ios.tsx`, a real UIMenu; there is
 * no equivalent on the other platforms, so this draws the same list in JS.
 */
const ActionMenu = ({ label, actions, onPrimaryAction }: ActionMenuProps) => {
  const styles = useStyles(makeStyles);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <PressableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => (onPrimaryAction ? onPrimaryAction() : setIsOpen(true))}
        onLongPress={() => setIsOpen(true)}>
        <AppText size={16}>{label}</AppText>
      </PressableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.sheet}>
            {actions.map((action) => (
              <PressableOpacity
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={styles.row}
                onPress={() => {
                  setIsOpen(false);
                  action.onPress();
                }}>
                <AppText size={16} color={action.isDestructive ? 'error' : 'text'}>
                  {action.label}
                </AppText>
              </PressableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.four,
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    },
    sheet: {
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: colors.backgroundElement
    },
    row: {
      padding: spacing.three
    }
  });

export default ActionMenu;

import MonthTrigger, { type MonthPickerProps } from '@/components/screens/home/month-trigger';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { Host } from '@expo/ui';
import { DatePicker, Popover, RNHostView } from '@expo/ui/swift-ui';
import { datePickerStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

// UICalendarView will not go under 320, and spaces its rows out above it.
const GRID_WIDTH = 344;
const GRID_INSET = 12;

/**
 * The month label, and the calendar popover it opens.
 *
 * A real SwiftUI popover rather than an imitation of one -- see ADR 0011. Below
 * iOS 16.4 it adapts into a sheet and loses its caret.
 *
 * `Popover` does not present itself: the trigger is content, not a button, so
 * the tap comes from the React Native label inside `RNHostView`.
 */
const MonthPopover = ({ selectedDay, onSelectDay }: MonthPickerProps) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // UTC throughout, like the rest of `lib/dates`. Local parts would move the
  // day by one west of Greenwich.
  const [year, month, date] = selectedDay.split('-').map(Number);
  const selection = new Date(Date.UTC(year, month - 1, date, 12));

  const onPick = (picked: Date) => {
    const day = picked.toISOString().slice(0, 10);

    setIsOpen(false);

    if (day !== selectedDay) onSelectDay(day);
  };

  return (
    <Host
      matchContents
      style={styles.host}
      seedColor={theme.colors.primary}
      colorScheme={theme.isDark ? 'dark' : 'light'}>
      <Popover
        isPresented={isOpen}
        onIsPresentedChange={setIsOpen}
        attachmentAnchor="bottom"
        arrowEdge="top">
        <Popover.Trigger>
          <RNHostView matchContents>
            <MonthTrigger selectedDay={selectedDay} onPress={() => setIsOpen(true)} />
          </RNHostView>
        </Popover.Trigger>
        <Popover.Content>
          <DatePicker
            selection={selection}
            displayedComponents={['date']}
            onDateChange={onPick}
            modifiers={[
              datePickerStyle('graphical'),
              frame({ width: GRID_WIDTH }),
              padding({ horizontal: GRID_INSET, vertical: GRID_INSET + 4 })
            ]}
          />
        </Popover.Content>
      </Popover>
    </Host>
  );
};

const makeStyles = () =>
  StyleSheet.create({
    host: {
      alignSelf: 'center'
    }
  });

export default MonthPopover;

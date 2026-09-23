import { Host } from '@expo/ui';
import { DatePicker, Popover, RNHostView } from '@expo/ui/swift-ui';
import { datePickerStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import MonthTrigger, { type MonthPickerProps } from '@/components/screens/home/month-trigger';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';

// UICalendarView will not go under 320, and spaces its rows out above it.
const GRID_WIDTH = 344;
const GRID_INSET = 12;

// A real SwiftUI popover. See ADR 0011. The label stays in React Native: inside
// `RNHostView` it was re-measured on return to Home and drew over the week strip.
const MonthPopover = ({ selectedDay, onSelectDay }: MonthPickerProps) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // UTC throughout: local parts move the day west of Greenwich.
  const [year, month, date] = selectedDay.split('-').map(Number);
  const selection = new Date(Date.UTC(year, month - 1, date, 12));

  const onPick = (picked: Date) => {
    const day = picked.toISOString().slice(0, 10);

    setIsOpen(false);

    if (day !== selectedDay) onSelectDay(day);
  };

  return (
    <View>
      <MonthTrigger selectedDay={selectedDay} onPress={() => setIsOpen(true)} />
      <Host
        matchContents
        style={styles.anchor}
        seedColor={theme.colors.primary}
        colorScheme={theme.isDark ? 'dark' : 'light'}>
        <Popover
          isPresented={isOpen}
          onIsPresentedChange={setIsOpen}
          attachmentAnchor="bottom"
          arrowEdge="top">
          <Popover.Trigger>
            <RNHostView matchContents>
              <View style={styles.anchorPoint} />
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
    </View>
  );
};

const makeStyles = () =>
  StyleSheet.create({
    anchor: {
      position: 'absolute',
      bottom: 0,
      alignSelf: 'center'
    },
    anchorPoint: {
      width: 1,
      height: 1
    }
  });

export default MonthPopover;

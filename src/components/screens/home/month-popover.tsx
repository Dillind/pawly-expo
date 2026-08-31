import MonthTrigger, { type MonthPickerProps } from '@/components/screens/home/month-trigger';

/**
 * The fallback for `month-popover.ios.tsx`. There is no anchored popover to
 * present here, so the label loses its chevron rather than opening a sheet.
 */
const MonthPopover = ({ selectedDay }: MonthPickerProps) => (
  <MonthTrigger selectedDay={selectedDay} />
);

export default MonthPopover;

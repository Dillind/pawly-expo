import { COMMON_TIMEZONES } from '@/constants/timezones';
import type {
  FeedingScheduleLabel,
  HouseholdRole,
  Option,
  PetSex,
  ThemePreference
} from '@/types/core';

export const ROLE_OPTIONS: Option<HouseholdRole>[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'contributor', label: 'Contributor' }
];

export const APPEARANCE_OPTIONS: Option<ThemePreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

export const SEX_OPTIONS: Option<PetSex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

export const FEEDING_SCHEDULE_LABEL_OPTIONS: Option<FeedingScheduleLabel>[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'custom', label: 'Custom' }
];

export const FEED_LOG_DAY_OPTIONS: Option<'today' | 'yesterday'>[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' }
];

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const TIMEZONE_OPTIONS: Option[] = (
  COMMON_TIMEZONES.includes(deviceTimezone as (typeof COMMON_TIMEZONES)[number])
    ? [...COMMON_TIMEZONES]
    : [deviceTimezone, ...COMMON_TIMEZONES]
).map((timezone) => ({ value: timezone, label: timezone }));

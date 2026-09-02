import type { IconName } from '@/constants/icon-map';
import { COMMON_TIMEZONES } from '@/constants/timezones';
import type {
  FeedingScheduleLabel,
  HouseholdRole,
  LeadMinutes,
  Option,
  PetSex,
  PetType,
  ReminderKind,
  ReminderLeadDays,
  ReminderRepeat,
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

export const PET_TYPE_OPTIONS: Option<PetType>[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'other', label: 'Other' }
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

/**
 * The Grace Window, as minutes either side of a Scheduled Time (ADR 0009).
 * Values are strings because a picker option is a string; the caller parses.
 */
export const GRACE_WINDOW_OPTIONS: Option[] = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1 hour 30 minutes' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' }
];

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const TIMEZONE_OPTIONS: Option[] = (
  COMMON_TIMEZONES.includes(deviceTimezone as (typeof COMMON_TIMEZONES)[number])
    ? [...COMMON_TIMEZONES]
    : [deviceTimezone, ...COMMON_TIMEZONES]
).map((timezone) => ({ value: timezone, label: timezone }));

// The stored value is a number of minutes; the label a member reads for the
// last one is "1 hour", never "60 minutes".
/** Mirrors the column default in 20260828090100. */
export const DEFAULT_LEAD_MINUTES: LeadMinutes = 15;

export const FEED_DUE_LEAD_OPTIONS: Option<LeadMinutes>[] = [
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' }
];

export const REMINDER_KIND_ICON: Record<ReminderKind, IconName> = {
  feed: 'utensils',
  medication: 'pill',
  vet: 'stethoscope'
};

export const REMINDER_KIND_OPTIONS: Option<ReminderKind>[] = [
  { value: 'feed', label: 'Feed' },
  { value: 'medication', label: 'Medication' },
  { value: 'vet', label: 'Vet' }
];

export const REMINDER_REPEAT_OPTIONS: Option<ReminderRepeat>[] = [
  { value: 'once', label: 'Never' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

export const DEFAULT_REMINDER_LEAD_DAYS: ReminderLeadDays = 1;

export const REMINDER_LEAD_OPTIONS: Option<ReminderLeadDays>[] = [
  { value: 1, label: '1 day early' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' }
];

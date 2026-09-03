import { Href } from 'expo-router';
import { StyleProp, ViewStyle } from 'react-native';

import type { ThemeMode } from '@/constants/theme';

export type IconBaseProps = {
  style?: StyleProp<ViewStyle>;
  color?: string;
  height?: number;
  width?: number;
  opacity?: number;
};

export type FontVariant = 'header' | 'body';

export type FontWeight = 'regular' | 'semibold' | 'bold';

export type ImageFolderType = 'example';

export type NavigationProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  route: Href;
};

export type MoreOptions = {
  label: string;
  icon: React.ReactNode;
  link?: string;
  route?: Href;
};

export type UserProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export type UserStats = {
  feedsLogged: number;
  postsCreated: number;
};

export type HouseholdRole = 'owner' | 'contributor';

export type Household = {
  id: string;
  name: string;
  timezone: string;
  graceWindowMinutes: number;
  role: HouseholdRole;
  isOwner: boolean;
};

/**
 * A household plus the pets that identify it. Every household defaults to
 * `<Name>'s Household`, so two rows in the switcher can read almost the same --
 * the pets are what make one recognisable.
 */
export type HouseholdSummary = Household & { pets: Pet[] };

export type Option<T = string> = {
  value: T;
  label: string;
};

/** Lead Time: how long before a feed a Member is nudged. Mirrors the check constraint. */
export type LeadMinutes = 10 | 15 | 30 | 60;

export type PetSex = 'male' | 'female';

export type Pet = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type HouseholdMember = {
  userId: string;
  role: HouseholdRole;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  /** Whether this member has opted in to being told when a feed is logged. */
  feedLoggedAlerts: boolean;
};

export type OccurrenceStateValue = 'fed' | 'due' | 'missed' | 'upcoming';

export type FeedingScheduleLabel = 'morning' | 'lunch' | 'dinner' | 'custom';

/**
 * Deliberately three. More species are expected — adding one is
 * `alter type ... add value`, which cannot share a transaction with other DDL,
 * so it needs a migration of its own.
 */
export type PetType = 'dog' | 'cat' | 'other';

/** Whether a birthdate is exact or a rough guess. Stored as birthdate_is_approximate. */
export type AgeMode = 'birthdate' | 'approximate';

/**
 * One expected feed on one local day. `seriesId` and `occurrenceDate` together
 * name it, and a feed log carries the same pair — which is what makes a Double
 * Feed a fact rather than a guess.
 */
export type Occurrence = {
  seriesId: string;
  /** ISO YYYY-MM-DD in the household's timezone. */
  occurrenceDate: string;
  /** Postgres `time`, e.g. "07:00:00". */
  localTime: string;
  label: FeedingScheduleLabel;
  instructions: string | null;
  scheduledAt: string;
  state: OccurrenceStateValue;
  satisfyingLogId: string | null;
  satisfiedAt: string | null;
  satisfiedBy: string | null;
};

export type FeedLogAuthor = {
  firstName: string | null;
  lastName: string | null;
};

export type FeedLog = {
  id: string;
  petId: string;
  loggedBy: string | null;
  loggedAt: string;
  notes: string | null;
  createdAt: string;
  author: FeedLogAuthor | null;
};

/** What the Member chose on Profile, as opposed to the scheme it resolves to. */
export type ThemePreference = ThemeMode | 'system';

export type ReminderKind = 'feed' | 'medication' | 'vet';
export type ReminderRepeat = 'once' | 'weekly' | 'monthly';
export type ReminderLeadDays = 1 | 2 | 3;
export type ReminderStateValue = 'due' | 'done' | 'future' | 'missed';

/** One Reminder on one date. The rule itself is never rendered. */
export type ReminderOccurrence = {
  reminderId: string;
  occurrenceDate: string;
  title: string;
  kind: ReminderKind;
  localTime: string;
  state: ReminderStateValue;
  doneBy: string | null;
  doneAt: string | null;
};

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
  // Null only while a seeded handle has not been written. See CRU-125.
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
  // Read as `@kathys-house`; stored without the @.
  handle: string | null;
  // Whether it appears in search. Never who may follow it.
  isListed: boolean;
  timezone: string;
  graceWindowMinutes: number;
  role: HouseholdRole;
  isOwner: boolean;
};

// Every household defaults to `<Name>'s Household`, so two switcher rows read
// almost the same. The pets are what make one recognisable.
export type HouseholdSummary = Household & { pets: Pet[] };

export type Option<T = string> = {
  value: T;
  label: string;
};

// Mirrors the check constraint on the column.
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
  feedLoggedAlerts: boolean;
};

export type OccurrenceStateValue = 'fed' | 'due' | 'missed' | 'upcoming';

export type FeedingScheduleLabel = 'morning' | 'lunch' | 'dinner' | 'custom';

// Adding a species is `alter type ... add value`, which cannot share a
// transaction with other DDL, so it needs a migration of its own.
export type PetType = 'dog' | 'cat' | 'other';

export type AgeMode = 'birthdate' | 'approximate';

// A feed log carries the same `seriesId` and `occurrenceDate` pair, which is
// what makes a Double Feed a fact rather than a guess.
export type Occurrence = {
  seriesId: string;
  // ISO YYYY-MM-DD in the household's timezone.
  occurrenceDate: string;
  // Postgres `time`, e.g. "07:00:00".
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

// What the Member chose, as opposed to the scheme it resolves to.
export type ThemePreference = ThemeMode | 'system';

export type ReminderKind = 'feed' | 'medication' | 'vet';
export type ReminderRepeat = 'once' | 'weekly' | 'monthly';
export type ReminderLeadDays = 1 | 2 | 3;
export type ReminderStateValue = 'due' | 'done' | 'future' | 'missed';

// One Reminder on one date. The rule itself is never rendered.
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

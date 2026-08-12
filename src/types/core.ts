import type { ThemeMode } from '@/constants/theme';
import { Href } from 'expo-router';
import { StyleProp, ViewStyle } from 'react-native';

export type IconBaseProps = {
  style?: StyleProp<ViewStyle>;
  color?: string;
  height?: number;
  width?: number;
  opacity?: number;
};

export type FontVariant = 'header' | 'body';

export type FontWeight = 'regular' | 'bold';

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
  /** Whether this member has opted in to being told when a feed is logged. */
  feedLoggedAlerts: boolean;
};

export type SlotStateValue = 'fed' | 'due' | 'missed' | 'upcoming';

export type FeedingScheduleLabel = 'morning' | 'lunch' | 'dinner' | 'custom';

export type SlotState = {
  scheduleId: string;
  /** Postgres `time`, e.g. "07:00:00". */
  scheduledTime: string;
  label: FeedingScheduleLabel;
  scheduledAt: string;
  state: SlotStateValue;
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

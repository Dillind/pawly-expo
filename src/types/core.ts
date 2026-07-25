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

export type DropdownItem<T extends string | number | null> = {
  label: string;
  value: T;
};

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
  timezone: string;
  graceWindowMinutes: number;
  role: HouseholdRole;
  isOwner: boolean;
};

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
};

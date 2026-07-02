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

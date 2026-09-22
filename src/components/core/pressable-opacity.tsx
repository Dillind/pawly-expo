import type { ReactNode, Ref } from 'react';
import { Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';

import { APP_ACTIVE_OPACITY } from '@/constants/primitives';

type Props = {
  style?: StyleProp<ViewStyle>;
  // The default 10% fade is invisible on anything as small as a single icon.
  // `ICON_ACTIVE_OPACITY` is the value for those.
  activeOpacity?: number;
  children: ReactNode;
  ref?: Ref<View>;
} & PressableProps;

const PressableOpacity = ({
  style,
  activeOpacity = APP_ACTIVE_OPACITY,
  children,
  ...props
}: Props) => (
  <Pressable {...props} style={({ pressed }) => [{ opacity: pressed ? activeOpacity : 1 }, style]}>
    {children}
  </Pressable>
);

export default PressableOpacity;

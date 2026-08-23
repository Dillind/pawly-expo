import { APP_ACTIVE_OPACITY } from '@/constants/primitives';
import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  /**
   * The default 10% fade is invisible on anything as small as a single icon.
   * `ICON_ACTIVE_OPACITY` is the value for those.
   */
  activeOpacity?: number;
  children: React.ReactNode;
} & PressableProps;

const PressableOpacity = React.forwardRef(
  (
    { style, activeOpacity = APP_ACTIVE_OPACITY, onPress, children, ...props }: Props,
    ref: React.Ref<View>
  ) => {
    const [isPressed, setIsPressed] = useState(false);
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={[{ opacity: isPressed ? activeOpacity : 1 }, style]}
        {...props}>
        {children}
      </Pressable>
    );
  }
);

PressableOpacity.displayName = 'PressableOpacity';

export default PressableOpacity;

import { APP_ACTIVE_OPACITY } from '@/constants/primitives';
import React, { LegacyRef, useState } from 'react';
import { Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
} & PressableProps;

const PressableOpacity = React.forwardRef(
  ({ style, onPress, children, ...props }: Props, ref: LegacyRef<View>) => {
    const [isPressed, setIsPressed] = useState(false);
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={[{ opacity: isPressed ? APP_ACTIVE_OPACITY : 1 }, style]}
        {...props}>
        {children}
      </Pressable>
    );
  }
);

PressableOpacity.displayName = 'PressableOpacity';

export default PressableOpacity;

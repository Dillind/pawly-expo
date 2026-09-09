import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';

type Props = {
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * A screen under a transparent native header, scrolled.
 *
 * Every state goes inside the scroll view, the loading spinner and the error
 * included. A bare ScreenView under a transparent header draws its content
 * beneath the navigation bar.
 */
const ScrollScreen = ({ contentContainerStyle, children }: Props) => (
  <ScreenView edges={[]}>
    <ScreenScrollView
      contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="automatic">
      {children}
    </ScreenScrollView>
  </ScreenView>
);

export default ScrollScreen;

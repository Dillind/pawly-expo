import { ScreenGutter } from '@/constants/theme';
import { ScrollView, type ScrollViewProps } from 'react-native';

/**
 * A screen's scroller, with the gutter on its content container.
 *
 * This is where the horizontal padding belongs: on the content, not on the
 * frame. The scroll view itself stays edge to edge, so the scroll indicator sits
 * where iOS puts it and a child that wants to be full-bleed only has to opt out
 * of this component rather than fight a parent's padding with negative margins.
 */
const ScreenScrollView = ({ contentContainerStyle, ...rest }: ScrollViewProps) => (
  <ScrollView
    {...rest}
    contentContainerStyle={[{ paddingHorizontal: ScreenGutter }, contentContainerStyle]}
  />
);

export default ScreenScrollView;

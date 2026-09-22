import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';

type Props = {
  count: number;
  hasVoted: boolean;
  isDisabled?: boolean;
  onPress: () => void;
};

const PressSpring = { duration: 250, dampingRatio: 0.6, reduceMotion: ReduceMotion.System };

const FeatureRequestVoteButton = ({ count, hasVoted, isDisabled = false, onPress }: Props) => {
  const styles = useStyles(makeStyles);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Upvote, ${count} ${count === 1 ? 'vote' : 'votes'}`}
      accessibilityState={{ selected: hasVoted, disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={8}
      onPressIn={() => scale.set(withSpring(0.92, PressSpring))}
      onPressOut={() => scale.set(withSpring(1, PressSpring))}
      onPress={() => {
        void hapticLight();
        onPress();
      }}>
      <Animated.View
        style={[
          styles.box,
          hasVoted && styles.voted,
          isDisabled && styles.disabled,
          animatedStyle
        ]}>
        <Icon
          name="caretUp"
          size={IconSize.control}
          color={hasVoted ? 'primaryText' : 'text'}
          strokeWidth={2.5}
        />
        <AppText size={15} fontWeight="bold" color={hasVoted ? 'primaryText' : 'text'}>
          {count}
        </AppText>
      </Animated.View>
    </Pressable>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    box: {
      width: 52,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      borderRadius: 14,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement
    },
    voted: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted
    },
    disabled: {
      opacity: 0.4
    }
  });

export default FeatureRequestVoteButton;

import { useEffect, useState } from 'react';
import { useFormContext, useFormState, type Control, type FieldValues } from 'react-hook-form';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { hapticSelection } from '@/lib/haptics';

import AppText from './app-text';
import PressableOpacity from './pressable-opacity';

type Option<T> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label?: string;
  /**
   * The field this control stands for. Without it the control cannot render its
   * own error — the same rule the other validated inputs follow.
   */
  name?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

const TrackPadding = Spacing.one;
const SegmentGap = Spacing.one;

// Apple's two designer parameters, which is the form Reanimated takes
// directly. Critically damped: a segment thumb must not overshoot its track.
const ThumbSpring = {
  duration: 400,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System
};

const SegmentedControl = <T extends string>({
  label,
  name,
  options,
  value,
  onChange
}: Props<T>) => {
  const styles = useStyles(makeStyles);
  const form = useFormContext();
  const [trackWidth, setTrackWidth] = useState(0);

  const translateX = useSharedValue(0);
  // The thumb must appear under the initial selection, not slide to it on mount.
  const hasSettled = useSharedValue(false);

  // -1 is a real answer, not a number to clamp away: a required field whose
  // value is still unset must not paint a thumb under the first option and
  // read as already chosen.
  const selectedIndex = options.findIndex((option) => option.value === value);
  const hasSelection = selectedIndex >= 0;

  const innerWidth = trackWidth - TrackPadding * 2;
  const segmentWidth =
    innerWidth > 0 ? (innerWidth - SegmentGap * (options.length - 1)) / options.length : 0;

  useEffect(() => {
    if (segmentWidth <= 0 || !hasSelection) return;

    const target = selectedIndex * (segmentWidth + SegmentGap);

    // An unset control has no thumb, so the first selection places it rather
    // than sliding it in from the left.
    if (hasSettled.get()) {
      translateX.set(withSpring(target, ThumbSpring));
    } else {
      translateX.set(target);
      hasSettled.set(true);
    }
  }, [hasSelection, hasSettled, segmentWidth, selectedIndex, translateX]);

  const thumbStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: translateX.get() }]
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (option: Option<T>) => {
    if (option.value === value) return;

    void hapticSelection();
    onChange(option.value);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <AppText size={14} fontWeight="bold">
          {label}
        </AppText>
      ) : null}
      <View style={styles.track} onLayout={handleLayout}>
        {segmentWidth > 0 && hasSelection ? (
          <Animated.View style={[styles.thumb, thumbStyle]} />
        ) : null}
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <PressableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
              style={styles.segment}
              onPress={() => handlePress(option)}>
              <AppText
                size={14}
                align="center"
                fontWeight={isSelected ? 'bold' : 'regular'}
                color={isSelected ? 'text' : 'textSecondary'}>
                {option.label}
              </AppText>
            </PressableOpacity>
          );
        })}
      </View>
      {form && name && <SubscribedFieldError control={form.control} name={name} />}
    </View>
  );
};

const SubscribedFieldError = ({
  control,
  name
}: {
  control: Control<FieldValues>;
  name: string;
}) => {
  const { errors } = useFormState({ control, name });

  return <FieldError marginTop={8} error={errors?.[name]?.message as string} />;
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.two
    },
    track: {
      flexDirection: 'row',
      gap: SegmentGap,
      padding: TrackPadding,
      borderRadius: 12,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    thumb: {
      position: 'absolute',
      top: TrackPadding,
      bottom: TrackPadding,
      left: TrackPadding,
      borderRadius: 10,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSelected
    },
    segment: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.two,
      borderRadius: 10
    }
  });

export default SegmentedControl;

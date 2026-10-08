import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PRESS_OPACITY, PRESS_SCALE, PRESS_SPRING } from '../theme/motion';

interface PressFeedbackProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Layout / surface of the button itself — never animated. */
  style?: StyleProp<ViewStyle>;
  /**
   * Layout of the button's *contents*. The content wrapper is the node that
   * carries the animated transform, so it needs the row/centering rules the
   * inline children used to provide.
   */
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  hitSlop?: number;
}

/**
 * Touchable button whose press feedback runs entirely on the UI thread.
 *
 * The previous pattern — `useState`-driven scale toggles, or `Animated` values
 * started from `onPress` — had to round-trip through React before the button
 * visibly reacted to a finger. Here `onPressIn` / `onPressOut` write straight
 * into a Reanimated shared value that a worklet maps onto the content's
 * `transform` and `opacity`, so the squash-and-release is rendered natively and
 * never waits for a JS re-render. Only composite properties are touched, so a
 * press can never trigger a layout pass.
 *
 * The touch target itself stays a plain `TouchableOpacity` that owns `onPress`,
 * `disabled` and the accessibility props, so hit-testing, a11y semantics and
 * any handler wiring are unchanged.
 */
export default function PressFeedback({
  children,
  onPress,
  disabled = false,
  style,
  contentStyle,
  accessibilityLabel,
  hitSlop,
}: PressFeedbackProps) {
  // 0 = released, 1 = held. Driven by the springs below, read by the worklet.
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const progress = pressed.value;
    return {
      opacity: 1 - (1 - PRESS_OPACITY) * progress,
      transform: [{ scale: 1 - (1 - PRESS_SCALE) * progress }],
    };
  });

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, PRESS_SPRING);
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, PRESS_SPRING);
  }, [pressed]);

  return (
    <TouchableOpacity
      style={style}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      // The worklet owns the visual press state on both platforms; the
      // platform's own touch-opacity would fight the animation.
      activeOpacity={1}
    >
      <Animated.View style={[contentStyle, animatedStyle]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

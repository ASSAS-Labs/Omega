import { useRef } from 'react';
import { View, StyleSheet, type GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme/colors';

interface DragHandleProps {
  /** Spoken label, e.g. "Reorder Bench Press". */
  accessibilityLabel: string;
  testID?: string;
  /** True while this handle's row is the one being dragged. */
  active?: boolean;
  onDragStart: () => void;
  /** Finger travel since the grab, in pixels (down = positive). */
  onDragMove: (deltaY: number) => void;
  onDragEnd: () => void;
}

/**
 * Grab handle (`≡`) for reordering a row.
 *
 * The drag is tracked with the responder system rather than a gesture library:
 * grabbing the handle claims the responder for the whole gesture, so the
 * surrounding ScrollView keeps scrolling everywhere else on the card while the
 * finger travels off the handle — and no worklet/native-driver setup is needed
 * to feed the offsets back into React state, which the reordering requires on
 * every crossing.
 */
export default function DragHandle({
  accessibilityLabel,
  testID,
  active = false,
  onDragStart,
  onDragMove,
  onDragEnd,
}: DragHandleProps) {
  const grabYRef = useRef(0);
  const draggingRef = useRef(false);

  const handleGrant = (event: GestureResponderEvent) => {
    grabYRef.current = event.nativeEvent.pageY;
    draggingRef.current = true;
    onDragStart();
  };

  const handleMove = (event: GestureResponderEvent) => {
    if (!draggingRef.current) return;
    onDragMove(event.nativeEvent.pageY - grabYRef.current);
  };

  const handleRelease = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onDragEnd();
  };

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      // Claim every touch that starts here, and keep it for the whole drag
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      hitSlop={8}
      style={[styles.handle, active && styles.handleActive]}
    >
      <Ionicons
        name="reorder-three-outline"
        size={22}
        color={active ? COLORS.accent : COLORS.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginRight: 12,
  },
  handleActive: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.borderLight,
  },
});

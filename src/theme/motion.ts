/**
 * Motion tokens for the app's native-thread animations.
 *
 * Every animation in the app is driven by Reanimated worklets so it executes on
 * the Android UI thread instead of the JS bridge, and only composite
 * properties are touched:
 *
 *   transform: [{ scale }, { translateX }, { translateY }], opacity
 *
 * Layout properties (width / height / margin / padding) are never animated
 * here: they force a reflow of the whole subtree on the UI thread and are the
 * usual cause of dropped frames while a finger is moving.
 */

/** Press feedback: fast, slightly under-damped so the button "pops". */
export const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 } as const;

/** Modal / sheet entrance: a touch of overshoot, long enough to read as motion. */
export const SHEET_SPRING = { damping: 22, stiffness: 210, mass: 0.9 } as const;

/** Exit timing for closing surfaces — quick, no bounce, so dismissal feels instant. */
export const EXIT_DURATION = 180;

/** How far a held control shrinks and dims (0 = untouched, 1 = fully pressed). */
export const PRESS_SCALE = 0.94;
export const PRESS_OPACITY = 0.82;

/** How far a sheet travels up from the bottom edge while it animates in. */
export const SHEET_TRAVEL = 28;

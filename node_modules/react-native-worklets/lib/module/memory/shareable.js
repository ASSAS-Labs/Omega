'use strict';

/**
 * Creates a new {@link Shareable} holding the provided initial value. You must
 * explicitly declare which Worklet Runtime will host the Shareable by passing
 * its `runtimeId`. To host on the UI Runtime, pass {@link UIRuntimeId}.
 *
 * @param hostRuntimeId - The `runtimeId` of the Worklet Runtime that will host
 *   the Shareable.
 * @param initial - The initial value of the Shareable.
 * @param config - Optional advanced configuration.
 * @returns The created {@link Shareable}.
 * @see {@link https://docs.swmansion.com/react-native-worklets/docs/memory/createShareable | createShareable docs}
 */
export function createShareable(_hostRuntimeId, _initial, _config) {
  throw new Error('[Worklets] `createShareable` is not supported on web.');
}
//# sourceMappingURL=shareable.js.map
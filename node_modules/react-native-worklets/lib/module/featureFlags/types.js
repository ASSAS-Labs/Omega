'use strict';

/**
 * This constant is needed for typechecking and preserving static typechecks in
 * generated .d.ts files. Without it, the static flags resolve to an object
 * without specific keys.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DefaultStaticFeatureFlags = {
  RUNTIME_TEST_FLAG: false,
  FETCH_PREVIEW_ENABLED: false,
  IOS_DYNAMIC_FRAMERATE_ENABLED: true,
  ENABLE_CROSS_RUNTIME_STACK_TRACES: true
};
export {};
//# sourceMappingURL=types.js.map
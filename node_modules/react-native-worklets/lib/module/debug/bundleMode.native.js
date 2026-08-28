'use strict';

// Worklets Babel Plugin replaces `false` with `true` here
// when Bundle Mode is enabled.
globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;
export function isBundleModeEnabled() {
  return globalThis._WORKLETS_BUNDLE_MODE_ENABLED === true && (() => {
    'worklet';
  }).__initData === undefined;
}
//# sourceMappingURL=bundleMode.native.js.map
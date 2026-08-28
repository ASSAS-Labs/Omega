'use strict';

import { init } from './initializers/initializers';

// Worklets Babel Plugin replaces `false` with `true` here
// when Bundle Mode is enabled.
globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;

// is-tree-shakable-suppress
init();
export { isBundleModeEnabled } from './debug/bundleMode';
export { toggleSlowAnimationsOnUIRuntime } from './debug/slowAnimations';
export { callMicrotasks, isShareableRef, makeShareable, makeShareableCloneOnUIRecursive, makeShareableCloneRecursive, shareableMappingCache } from "./deprecated.js";
export { getDynamicFeatureFlag, getStaticFeatureFlag, setDynamicFeatureFlag } from './featureFlags/featureFlags';
export { isShareable } from "./memory/isShareable.js";
export { isSynchronizable } from "./memory/isSynchronizable.js";
export { createSerializable, isSerializableRef, registerCustomSerializable } from './memory/serializable';
export { serializableMappingCache } from './memory/serializableMappingCache';
export { createShareable } from './memory/shareable';
export { createSynchronizable } from './memory/synchronizable';
export { getRuntimeKind, isRNRuntime, isUIRuntime, isWorkerRuntime, isWorkletRuntime, RuntimeKind } from "./runtimeKind.js";
export { createWorkletRuntime, getUIRuntimeHolder, getUISchedulerHolder, runOnRuntime, runOnRuntimeAsync, runOnRuntimeAsyncWithId, runOnRuntimeSync, runOnRuntimeSyncWithId, scheduleOnRuntime, scheduleOnRuntimeWithId, UIRuntimeId } from './runtimes';
export { executeOnUIRuntimeSync, runOnJS, runOnUI, runOnUIAsync, runOnUISync, scheduleOnRN, scheduleOnUI } from './threads';
export { isWorkletFunction } from "./workletFunction.js";
export { WorkletsModule } from './WorkletsModule/NativeWorklets';
//# sourceMappingURL=index.js.map
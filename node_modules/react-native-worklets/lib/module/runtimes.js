'use strict';

import { RuntimeKind } from "./runtimeKind.js";
// is-tree-shakable-suppress
export const UIRuntimeId = RuntimeKind.UI;
export function createWorkletRuntime() {
  throw new Error('[Worklets] `createWorkletRuntime` is not supported on web.');
}
export function runOnRuntime() {
  throw new Error('[Worklets] `runOnRuntime` is not supported on web.');
}
export function scheduleOnRuntime() {
  throw new Error('[Worklets] `scheduleOnRuntime` is not supported on web.');
}
export function scheduleOnRuntimeWithId() {
  throw new Error('[Worklets] `scheduleOnRuntimeWithId` is not supported on web.');
}
export function runOnRuntimeSync() {
  throw new Error('[Worklets] `runOnRuntimeSync` is not supported on web.');
}
export function runOnRuntimeSyncWithId() {
  throw new Error('[Worklets] `runOnRuntimeSyncWithId` is not supported on web.');
}
export function runOnRuntimeAsync() {
  throw new Error('[Worklets] `runOnRuntimeAsync` is not supported on web.');
}
export function runOnRuntimeAsyncWithId() {
  throw new Error('[Worklets] `runOnRuntimeAsyncWithId` is not supported on web.');
}
export function getUIRuntimeHolder() {
  throw new Error('[Worklets] `getUIRuntimeHolder` is not supported on web.');
}
export function getUISchedulerHolder() {
  throw new Error('[Worklets] `getUISchedulerHolder` is not supported on web.');
}
//# sourceMappingURL=runtimes.js.map
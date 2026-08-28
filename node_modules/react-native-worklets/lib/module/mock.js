'use strict';

import { mockedRequestAnimationFrame } from "./runLoop/uiRuntime/mockedRequestAnimationFrame.js";
import { RuntimeKind } from "./runtimeKind.js";
import { isWorkletFunction } from "./workletFunction.js";
const NOOP = () => {};
const NOOP_FACTORY = () => NOOP;
const UI_RUNTIME_HOLDER = {};
const UI_SCHEDULER_HOLDER = {};
const ID = value => value;
const IMMEDIATE_CALLBACK_INVOCATION = callback => callback();
globalThis._WORKLET = false;
globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;
globalThis._log = console.log;
globalThis._getAnimationTimestamp = () => performance.now();
// requestAnimationFrame react-native jest's setup is incorrect as it polyfills
// the method directly using setTimeout, therefore the callback doesn't get the
// expected timestamp as the only argument.
// We override this setup here to make sure that callbacks get the proper timestamps
// when executed. For non-jest environments we define requestAnimationFrame in setupRequestAnimationFrame
// @ts-ignore TypeScript uses Node definition for rAF, setTimeout, etc which returns a Timeout object rather than a number
globalThis.requestAnimationFrame = mockedRequestAnimationFrame;
const WorkletAPI = {
  callMicrotasks: NOOP,
  createSerializable: ID,
  createShareable(_hostRuntimeId, initial) {
    let value = initial;
    const set = next => {
      value = typeof next === 'function' ? next(value) : next;
    };
    return {
      isHost: false,
      __shareableRef: true,
      getAsync: () => Promise.resolve(value),
      getSync: () => value,
      setAsync: set,
      setSync: set
    };
  },
  createSynchronizable: ID,
  createWorkletRuntime: NOOP_FACTORY,
  executeOnUIRuntimeSync: ID,
  getDynamicFeatureFlag: () => false,
  getRuntimeKind: () => RuntimeKind.ReactNative,
  getStaticFeatureFlag: () => false,
  getUIRuntimeHolder: () => UI_RUNTIME_HOLDER,
  getUISchedulerHolder: () => UI_SCHEDULER_HOLDER,
  isBundleModeEnabled: () => false,
  isRNRuntime: () => true,
  isSerializableRef: ID,
  isShareable: value => typeof value === 'object' && value !== null && !!value.__shareableRef,
  isShareableRef: () => true,
  isSynchronizable: () => false,
  isUIRuntime: () => false,
  // maybe it should be true?
  isWorkerRuntime: () => false,
  isWorkletFunction: isWorkletFunction,
  isWorkletRuntime: () => false,
  makeShareable: ID,
  makeShareableCloneOnUIRecursive: ID,
  makeShareableCloneRecursive: ID,
  registerCustomSerializable: NOOP,
  runOnJS(fun) {
    return (...args) => queueMicrotask(args.length ? () => fun(...args) : fun);
  },
  runOnRuntime: ID,
  runOnRuntimeAsync(_workletRuntime, worklet, ...args) {
    return WorkletAPI.runOnUIAsync(worklet, ...args);
  },
  runOnRuntimeAsyncWithId(_runtimeId, worklet, ...args) {
    return WorkletAPI.runOnUIAsync(worklet, ...args);
  },
  runOnRuntimeSync(_workletRuntime, worklet, ...args) {
    return worklet(...args);
  },
  runOnRuntimeSyncWithId(_runtimeId, worklet, ...args) {
    return worklet(...args);
  },
  runOnUI(worklet) {
    return (...args) => {
      // Mocking time in Jest is tricky as both requestAnimationFrame and queueMicrotask
      // callbacks run on the same queue and can be interleaved. There is no way
      // to flush particular queue in Jest and the only control over mocked timers
      // is by using jest.advanceTimersByTime() method which advances all types
      // of timers including immediate and animation callbacks. Ideally we'd like
      // to have some way here to schedule work along with React updates, but
      // that's not possible, and hence in Jest environment instead of using scheduling
      // mechanism we just schedule the work ommiting the queue. This is ok for the
      // uses that we currently have but may not be ok for future tests that we write.
      mockedRequestAnimationFrame(() => {
        worklet(...args);
      });
    };
  },
  runOnUIAsync(worklet, ...args) {
    return new Promise(resolve => {
      mockedRequestAnimationFrame(() => {
        const result = worklet(...args);
        resolve(result);
      });
    });
  },
  runOnUISync: IMMEDIATE_CALLBACK_INVOCATION,
  RuntimeKind: RuntimeKind,
  scheduleOnRN(fun, ...args) {
    WorkletAPI.runOnJS(fun)(...args);
  },
  scheduleOnRuntime: IMMEDIATE_CALLBACK_INVOCATION,
  scheduleOnRuntimeWithId(_runtimeId, worklet, ...args) {
    WorkletAPI.scheduleOnUI(worklet, ...args);
  },
  scheduleOnUI(worklet, ...args) {
    WorkletAPI.runOnUI(worklet)(...args);
  },
  serializableMappingCache: new Map(),
  setDynamicFeatureFlag: NOOP,
  shareableMappingCache: new Map(),
  toggleSlowAnimationsOnUIRuntime: () => false,
  UIRuntimeId: RuntimeKind.UI,
  WorkletsModule: {}
};
module.exports = {
  __esModule: true,
  ...WorkletAPI
};
//# sourceMappingURL=mock.js.map
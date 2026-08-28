'use strict';

export let RuntimeKind = /*#__PURE__*/function (RuntimeKind) {
  /**
   * The React Native runtime, which is the main runtime for React Native where
   * React exists and where components are rendered.
   */
  RuntimeKind[RuntimeKind["ReactNative"] = 1] = "ReactNative";
  /**
   * The UI runtime, which is a special runtime that executes on the UI thread,
   * mostly used for animations and gestures.
   */
  RuntimeKind[RuntimeKind["UI"] = 2] = "UI";
  /** Additional runtime created on-demand by the user. */
  RuntimeKind[RuntimeKind["Worker"] = 3] = "Worker";
  return RuntimeKind;
}({});

/**
 * Programmatic way to check the current runtime kind. It's useful when you need
 * specific implementations for different runtimes created by Worklets.
 *
 * For more optimized calls you can check the value of
 * `globalThis.__RUNTIME_KIND` directly.
 *
 * @returns The kind of the current runtime.
 */
export function getRuntimeKind() {
  'worklet';

  return globalThis.__RUNTIME_KIND;
}

/**
 * Checks if the current runtime is the [React Native
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds/#rn-runtime).
 *
 * @returns `true` if the current runtime is the React Native Runtime, `false`
 *   otherwise.
 */
export function isRNRuntime() {
  'worklet';

  return globalThis.__RUNTIME_KIND === 1;
}

/**
 * Checks if the current runtime is a [Worklet
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds/#worklet-runtime).
 *
 * @returns `true` if the current runtime is a Worklet Runtime, `false`
 *   otherwise.
 */
export function isWorkletRuntime() {
  'worklet';

  return globalThis.__RUNTIME_KIND !== 1;
}

/**
 * Checks if the current runtime is the [UI
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds/#ui-runtime).
 *
 * @returns `true` if the current runtime is the UI Runtime, `false` otherwise.
 */
export function isUIRuntime() {
  'worklet';

  return globalThis.__RUNTIME_KIND === 2;
}

/**
 * Checks if the current runtime is a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds/#worker-runtime).
 *
 * @returns `true` if the current runtime is a Worker Runtime, `false`
 *   otherwise.
 */
export function isWorkerRuntime() {
  'worklet';

  return globalThis.__RUNTIME_KIND === 3;
}

// is-tree-shakable-suppress
if (globalThis.__RUNTIME_KIND === undefined) {
  // In Jest environments eager imports make this file to evaluate before
  // `initializers.ts` file, therefore we have to set the RuntimeKind here,
  // just to be safe.
  globalThis.__RUNTIME_KIND = RuntimeKind.ReactNative;
}
//# sourceMappingURL=runtimeKind.js.map
import type { WorkletFunction, WorkletRuntime, WorkletRuntimeConfig } from './types';
/**
 * The ID of the [UI Worklet
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 */
export declare const UIRuntimeId: 2;
/**
 * Lets you create a new JS runtime which can be used to run worklets possibly
 * on different threads than JS or UI thread.
 *
 * @param config - Runtime configuration object - {@link WorkletRuntimeConfig}.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/
 */
export declare function createWorkletRuntime(config?: WorkletRuntimeConfig): WorkletRuntime;
/**
 * @deprecated Please use the new config object signature instead:
 *   `createWorkletRuntime({ name, initializer })`
 *
 *   Lets you create a new JS runtime which can be used to run worklets possibly
 *   on different threads than JS or UI thread.
 * @param name - A name used to identify the runtime which will appear in
 *   devices list in Chrome DevTools.
 * @param initializer - An optional worklet that will be run synchronously on
 *   the same thread immediately after the runtime is created.
 * @returns WorkletRuntime which is a
 *   `jsi::HostObject<worklets::WorkletRuntime>` - {@link WorkletRuntime}
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime/
 */
export declare function createWorkletRuntime(name?: string, initializer?: () => void): WorkletRuntime;
/**
 * Lets you asynchronously run a
 * [worklet](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet)
 * on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime).
 *
 * Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * - The worklet is scheduled on the Worker Runtime's [Async
 *   Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/RunLoop/AsyncQueue.h)
 *
 * @param workletRuntime - The runtime to schedule the worklet on.
 * @param worklet - The worklet to schedule.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export declare function scheduleOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): void;
/**
 * Lets you asynchronously run a
 * [worklet](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet)
 * on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime)
 * identified by the runtime's id.
 *
 * Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * - The worklet is scheduled on the Worker Runtime's [Async
 *   Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/RunLoop/AsyncQueue.h)
 *
 * @param runtimeId - The id of the runtime to schedule the worklet on.
 * @param worklet - The worklet to schedule.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export declare function scheduleOnRuntimeWithId<Args extends unknown[], ReturnValue>(runtimeId: number, worklet: (...args: Args) => ReturnValue, ...args: Args): void;
/**
 * @deprecated Use `scheduleOnRuntime` instead.
 *
 *   Schedule a worklet to execute on the background queue.
 */
export declare function runOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue): WorkletFunction<Args, ReturnValue>;
/**
 * Lets you run a function synchronously on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime).
 *
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime).
 *   or another [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime),
 *   unless the [Bundle
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/) is
 *   enabled.
 *
 * @param workletRuntime - The runtime to run the worklet on.
 * @param worklet - The worklet to run.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export declare function runOnRuntimeSync<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): ReturnValue;
/**
 * Lets you run a function synchronously on a [Worklet
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worklet-runtime)
 * identified by the runtime's id.
 *
 * - This function cannot be called from the [UI
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#ui-runtime)
 *   or a [Worker
 *   Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime),
 *   unless the [Bundle
 *   Mode](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/) is
 *   enabled.
 * - You can target the UI Runtime with this function by passing
 *   {@link UIRuntimeId} as the `runtimeId` argument.
 *
 * @param runtimeId - The id of the runtime to run the worklet on.
 * @param worklet - The worklet to run.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export declare function runOnRuntimeSyncWithId<Args extends unknown[], ReturnValue>(runtimeId: number, worklet: (...args: Args) => ReturnValue, ...args: Args): ReturnValue;
/**
 * Lets you asynchronously run a
 * [worklet](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet)
 * on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime)
 * and get the result via a Promise.
 *
 * - The worklet is scheduled on the Worker Runtime's Async Queue
 * - Returns a Promise that resolves with the worklet's return value
 *
 * @param workletRuntime - The runtime to run the worklet on.
 * @param worklet - The worklet to run.
 * @param args - The arguments to pass to the worklet.
 * @returns A Promise that resolves to the return value of the worklet.
 * @see https://docs.swmansion.com/react-native-worklets/docs/threading/runOnRuntimeAsync
 */
export declare function runOnRuntimeAsync<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): Promise<ReturnValue>;
/**
 * Lets you asynchronously run a
 * [worklet](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary#worklet)
 * on a [Worker
 * Runtime](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worker-runtime)
 * identified by the runtime's id.
 *
 * Check
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds}
 * for more information about the different runtime kinds.
 *
 * - The worklet is scheduled on the Worker Runtime's [Async
 *   Queue](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-worklets/Common/cpp/worklets/RunLoop/AsyncQueue.h)
 *
 * @param runtimeId - The id of the runtime to schedule the worklet on.
 * @param worklet - The worklet to schedule.
 * @param args - The arguments to pass to the worklet.
 * @returns The return value of the worklet.
 */
export declare function runOnRuntimeAsyncWithId<Args extends unknown[], ReturnValue>(runtimeId: number, worklet: (...args: Args) => ReturnValue, ...args: Args): Promise<ReturnValue>;
export declare function getUIRuntimeHolder(): object;
export declare function getUISchedulerHolder(): object;
//# sourceMappingURL=runtimes.native.d.ts.map
import { RuntimeKind } from './runtimeKind';
import type { WorkletFunction, WorkletRuntime, WorkletRuntimeConfig } from './types';
export declare const UIRuntimeId = RuntimeKind.UI;
export declare function createWorkletRuntime(config?: WorkletRuntimeConfig): WorkletRuntime;
export declare function createWorkletRuntime(name?: string, initializer?: () => void): WorkletRuntime;
export declare function runOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue): WorkletFunction<Args, ReturnValue>;
export declare function scheduleOnRuntime<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): void;
export declare function scheduleOnRuntimeWithId<Args extends unknown[], ReturnValue>(runtimeId: number, worklet: (...args: Args) => ReturnValue, ...args: Args): void;
export declare function runOnRuntimeSync<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): ReturnValue;
export declare function runOnRuntimeSyncWithId<Args extends unknown[], ReturnValue>(runtimeId: number, worklet: (...args: Args) => ReturnValue, ...args: Args): ReturnValue;
export declare function runOnRuntimeAsync<Args extends unknown[], ReturnValue>(workletRuntime: WorkletRuntime, worklet: (...args: Args) => ReturnValue, ...args: Args): Promise<ReturnValue>;
export declare function runOnRuntimeAsyncWithId<Args extends unknown[], ReturnValue>(runtimeId: number, worklet: (...args: Args) => ReturnValue, ...args: Args): Promise<ReturnValue>;
export declare function getUIRuntimeHolder(): object;
export declare function getUISchedulerHolder(): object;
//# sourceMappingURL=runtimes.d.ts.map
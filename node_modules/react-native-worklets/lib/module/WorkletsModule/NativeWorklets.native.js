'use strict';

import { isBundleModeEnabled } from '../debug/bundleMode';
import { checkCppVersion } from "../debug/checkCppVersion.js";
import { jsVersion } from "../debug/jsVersion.js";
import { installCustomSerializableUnpacker } from '../memory/customSerializableUnpacker';
import { installRemoteFunctionUnpacker } from '../memory/remoteFunctionUnpacker';
import { installShareableGuestUnpacker } from '../memory/shareableGuestUnpacker';
import { installShareableHostUnpacker } from '../memory/shareableHostUnpacker';
import { installSynchronizableUnpacker } from '../memory/synchronizableUnpacker';
import { installValueUnpacker } from '../memory/valueUnpacker';
import { isRNRuntime } from "../runtimeKind.js";
import { WorkletsTurboModule } from "../specs/index.js";
class NativeWorklets {
  #workletsModuleProxy;
  #serializableUndefined;
  #serializableNull;
  #serializableTrue;
  #serializableFalse;
  constructor() {
    const bundleModeEnabled = isBundleModeEnabled();
    globalThis._WORKLETS_VERSION_JS = jsVersion;
    const onRNRuntime = isRNRuntime();
    if (globalThis.__workletsModuleProxy === undefined && onRNRuntime) {
      WorkletsTurboModule?.installTurboModule(bundleModeEnabled);
      if (!bundleModeEnabled) {
        installUnpackers(globalThis.__workletsModuleProxy);
      }
      WorkletsTurboModule?.start();
    }
    if (globalThis.__workletsModuleProxy === undefined) {
      throw new Error(`[Worklets] Native part of Worklets doesn't seem to be initialized.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#native-part-of-worklets-doesnt-seem-to-be-initialized for more details.`);
    }
    if (__DEV__) {
      if (bundleModeEnabled) {
        console.log('[Worklets] Bundle mode initialization: Downloaded the bundle for Worklet Runtimes.');
      }
      if (onRNRuntime) {
        checkCppVersion();
      }
    }
    this.#workletsModuleProxy = globalThis.__workletsModuleProxy;
    this.#serializableNull = this.#workletsModuleProxy.createSerializableNull();
    this.#serializableUndefined = this.#workletsModuleProxy.createSerializableUndefined();
    this.#serializableTrue = this.#workletsModuleProxy.createSerializableBoolean(true);
    this.#serializableFalse = this.#workletsModuleProxy.createSerializableBoolean(false);
  }
  createSerializableImport(from, to) {
    return this.#workletsModuleProxy.createSerializableImport(from, to);
  }
  createSerializableString(str) {
    return this.#workletsModuleProxy.createSerializableString(str);
  }
  createSerializableNumber(num) {
    return this.#workletsModuleProxy.createSerializableNumber(num);
  }
  createSerializableBoolean(bool) {
    return bool ? this.#serializableTrue : this.#serializableFalse;
  }
  createSerializableBigInt(bigInt) {
    return this.#workletsModuleProxy.createSerializableBigInt(bigInt);
  }
  createSerializableUndefined() {
    return this.#serializableUndefined;
  }
  createSerializableNull() {
    return this.#serializableNull;
  }
  createSerializableTurboModuleLike(props, proto) {
    return this.#workletsModuleProxy.createSerializableTurboModuleLike(props, proto);
  }
  createSerializableObject(obj, shouldRetainRemote, nativeStateSource) {
    return this.#workletsModuleProxy.createSerializableObject(obj, shouldRetainRemote, nativeStateSource);
  }
  createSerializableHostObject(obj) {
    return this.#workletsModuleProxy.createSerializableHostObject(obj);
  }
  createSerializableArray(array, shouldRetainRemote = false) {
    return this.#workletsModuleProxy.createSerializableArray(array, shouldRetainRemote);
  }
  createSerializableArrayBuffer(arrayBuffer) {
    return this.#workletsModuleProxy.createSerializableArrayBuffer(arrayBuffer);
  }
  createSerializableMap(keys, values) {
    return this.#workletsModuleProxy.createSerializableMap(keys, values);
  }
  createSerializableSet(values) {
    return this.#workletsModuleProxy.createSerializableSet(values);
  }
  createSerializableError(name, message, stack) {
    return this.#workletsModuleProxy.createSerializableError(name, message, stack);
  }
  createSerializableRegExp(pattern, flags) {
    return this.#workletsModuleProxy.createSerializableRegExp(pattern, flags);
  }
  createSerializableArrayBufferView(typeName, buffer, byteOffset, length) {
    return this.#workletsModuleProxy.createSerializableArrayBufferView(typeName, buffer, byteOffset, length);
  }
  createSerializableInitializer(obj) {
    return this.#workletsModuleProxy.createSerializableInitializer(obj);
  }
  createSerializableNonWorkletFunction(fun, functionName) {
    return this.#workletsModuleProxy.createSerializableNonWorkletFunction(fun, functionName);
  }
  createSerializableWorklet(worklet, shouldPersistRemote) {
    return this.#workletsModuleProxy.createSerializableWorklet(worklet, shouldPersistRemote);
  }
  createCustomSerializable(data, typeId) {
    return this.#workletsModuleProxy.createCustomSerializable(data, typeId);
  }
  registerCustomSerializable(determine, pack, unpack, typeId) {
    this.#workletsModuleProxy.registerCustomSerializable(determine, pack, unpack, typeId);
  }
  createShareable(hostRuntimeId, initial, initSynchronously, decorateHost, decorateRef) {
    return this.#workletsModuleProxy.createShareable(hostRuntimeId, initial, initSynchronously, decorateHost, decorateRef);
  }
  scheduleOnRN(fun, args) {
    this.#workletsModuleProxy.scheduleOnRN(fun, args);
  }
  scheduleOnUI(serializableArrayOfWorklets, scheduleStacks) {
    return this.#workletsModuleProxy.scheduleOnUI(serializableArrayOfWorklets, scheduleStacks);
  }
  runOnUISync(worklet, scheduleStack) {
    return this.#workletsModuleProxy.runOnUISync(worklet, scheduleStack);
  }
  createWorkletRuntime(name, initializer, useDefaultQueue, customQueue, enableEventLoop, enableLocking) {
    return this.#workletsModuleProxy.createWorkletRuntime(name, initializer, useDefaultQueue, customQueue, enableEventLoop, enableLocking);
  }
  scheduleOnRuntime(workletRuntime, serializableWorklet, scheduleStack) {
    return this.#workletsModuleProxy.scheduleOnRuntime(workletRuntime, serializableWorklet, scheduleStack);
  }
  scheduleOnRuntimeWithId(runtimeId, worklet, scheduleStack) {
    return this.#workletsModuleProxy.scheduleOnRuntimeWithId(runtimeId, worklet, scheduleStack);
  }
  runOnRuntimeSync(workletRuntime, worklet, scheduleStack) {
    return this.#workletsModuleProxy.runOnRuntimeSync(workletRuntime, worklet, scheduleStack);
  }
  runOnRuntimeSyncWithId(runtimeId, worklet, scheduleStack) {
    return this.#workletsModuleProxy.runOnRuntimeSyncWithId(runtimeId, worklet, scheduleStack);
  }
  handlePromise(resolveOrReject, valueOrError) {
    return this.#workletsModuleProxy.handlePromise(resolveOrReject, valueOrError);
  }
  createSynchronizable(value) {
    return this.#workletsModuleProxy.createSynchronizable(value);
  }
  synchronizableGetDirty(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableGetDirty(synchronizableRef);
  }
  synchronizableGetBlocking(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableGetBlocking(synchronizableRef);
  }
  synchronizableSetBlocking(synchronizableRef, value) {
    return this.#workletsModuleProxy.synchronizableSetBlocking(synchronizableRef, value);
  }
  synchronizableLock(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableLock(synchronizableRef);
  }
  synchronizableUnlock(synchronizableRef) {
    return this.#workletsModuleProxy.synchronizableUnlock(synchronizableRef);
  }
  reportFatalErrorOnJS(message, stack, name) {
    return this.#workletsModuleProxy.reportFatalErrorOnJS(message, stack, name);
  }
  getStaticFeatureFlag(name) {
    return this.#workletsModuleProxy.getStaticFeatureFlag(name);
  }
  setDynamicFeatureFlag(name, value) {
    this.#workletsModuleProxy.setDynamicFeatureFlag(name, value);
  }
  getUIRuntimeHolder() {
    return this.#workletsModuleProxy.getUIRuntimeHolder();
  }
  getUISchedulerHolder() {
    return this.#workletsModuleProxy.getUISchedulerHolder();
  }
  toggleSlowAnimationsOnUIRuntime() {
    return WorkletsTurboModule?.toggleSlowAnimationsOnUIRuntime() ?? false;
  }
}
export const WorkletsModule = new NativeWorklets();
function installUnpackers(workletsModuleProxy) {
  const value = installValueUnpacker.__initData;
  const synchronizable = installSynchronizableUnpacker.__initData;
  const customSerializable = installCustomSerializableUnpacker.__initData;
  const shareableHost = installShareableHostUnpacker.__initData;
  const shareableGuest = installShareableGuestUnpacker.__initData;
  const remoteFunction = installRemoteFunctionUnpacker.__initData;
  if (value.bytecode !== undefined) {
    if (__DEV__) {
      throw new Error('[Worklets] Unpackers were compiled to Hermes bytecode in a development build, which is not supported.');
    }
    workletsModuleProxy.loadUnpackersWithBytecode(value.bytecode, synchronizable.bytecode, customSerializable.bytecode, shareableHost.bytecode, shareableGuest.bytecode, remoteFunction.bytecode);
  } else {
    workletsModuleProxy.loadUnpackersWithCode(value.code, value.location ?? '', value.sourceMap ?? '', synchronizable.code, synchronizable.location ?? '', synchronizable.sourceMap ?? '', customSerializable.code, customSerializable.location ?? '', customSerializable.sourceMap ?? '', shareableHost.code, shareableHost.location ?? '', shareableHost.sourceMap ?? '', shareableGuest.code, shareableGuest.location ?? '', shareableGuest.sourceMap ?? '', remoteFunction.code, remoteFunction.location ?? '', remoteFunction.sourceMap ?? '');
  }
}
//# sourceMappingURL=NativeWorklets.native.js.map
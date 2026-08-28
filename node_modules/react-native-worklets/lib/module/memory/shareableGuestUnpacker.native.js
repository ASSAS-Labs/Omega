/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

export function installShareableGuestUnpacker() {
  'worklet';
  'no-worklet-closure';

  let runOnRuntimeSyncFromId;
  let runOnRuntimeAsyncFromId;
  let memoize;
  let scheduleOnRuntimeFromId;
  let serializer;
  if (globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    serializer = require('./serializable').createSerializable;
    const {
      serializableMappingCache
    } = require('./serializableMappingCache');
    memoize = serializableMappingCache.set.bind(serializableMappingCache);
    runOnRuntimeSyncFromId = require('../runtimes').runOnRuntimeSyncWithId;
    runOnRuntimeAsyncFromId = require('../runtimes').runOnRuntimeAsyncWithId;
    scheduleOnRuntimeFromId = require('../runtimes').scheduleOnRuntimeWithId;
  } else {
    // Serializer can't be inlined here because it might be yet undefined
    // when the unpacker is installed.
    serializer = value => globalThis.__serializer(value);
    memoize = () => {
      // No-op on Worklet Runtimes outside of Bundle Mode.
    };
    const proxy = globalThis.__workletsModuleProxy;
    runOnRuntimeSyncFromId = (hostId, worklet, ...args) => {
      const serializedWorklet = serializer(() => {
        'worklet';
        'limit-init-data-hoisting';

        return globalThis.__serializer(worklet(...args));
      });
      return proxy.runOnRuntimeSyncWithId(hostId, serializedWorklet);
    };
    scheduleOnRuntimeFromId = (hostId, worklet, ...args) => {
      proxy.scheduleOnRuntimeWithId(hostId, serializer(() => {
        'worklet';
        'limit-init-data-hoisting';

        return globalThis.__serializer(worklet(...args));
      }));
    };
    runOnRuntimeAsyncFromId = () => {
      throw new Error('[Worklets] `Shareable.getAsync` can only be called on the RN Runtime.');
    };
  }
  function shareableGuestUnpacker(hostId, shareableRef, guestDecorator) {
    let shareableGuest = shareableRef;
    shareableGuest.isHost = false;
    shareableGuest.__shareableRef = true;
    const get = () => {
      'worklet';
      'limit-init-data-hoisting';

      return shareableGuest.value;
    };
    const setWithValue = value => {
      'worklet';
      'limit-init-data-hoisting';

      shareableGuest.value = value;
    };
    const setWithSetter = setter => {
      'worklet';
      'limit-init-data-hoisting';

      const currentValue = shareableGuest.value;
      const newValue = setter(currentValue);
      shareableGuest.value = newValue;
    };
    shareableGuest.getAsync = () => {
      return runOnRuntimeAsyncFromId(hostId, get);
    };
    shareableGuest.getSync = () => {
      return runOnRuntimeSyncFromId(hostId, get);
    };
    shareableGuest.setAsync = value => {
      if (typeof value === 'function') {
        scheduleOnRuntimeFromId(hostId, setWithSetter, value);
      } else {
        scheduleOnRuntimeFromId(hostId, setWithValue, value);
      }
    };
    shareableGuest.setSync = value => {
      if (typeof value === 'function') {
        runOnRuntimeSyncFromId(hostId, setWithSetter, value);
      } else {
        runOnRuntimeSyncFromId(hostId, setWithValue, value);
      }
    };
    if (guestDecorator) {
      shareableGuest = guestDecorator(shareableGuest);
    }
    memoize(shareableGuest, shareableRef);
    return shareableGuest;
  }
  globalThis.__shareableGuestUnpacker = shareableGuestUnpacker;
}
//# sourceMappingURL=shareableGuestUnpacker.native.js.map
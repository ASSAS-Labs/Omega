/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

export function installSynchronizableUnpacker() {
  'worklet';
  'no-worklet-closure';

  // TODO: Add cache for synchronizables.
  const serializer = globalThis.__RUNTIME_KIND === 1 || globalThis._WORKLETS_BUNDLE_MODE_ENABLED ? require('./serializable').createSerializable : value => globalThis.__serializer(value);
  function synchronizableUnpacker(synchronizableRef) {
    const synchronizable = synchronizableRef;
    const proxy = globalThis.__workletsModuleProxy;
    synchronizable.__synchronizableRef = true;
    synchronizable.getDirty = () => {
      return proxy.synchronizableGetDirty(synchronizable);
    };
    synchronizable.getBlocking = () => {
      return proxy.synchronizableGetBlocking(synchronizable);
    };
    synchronizable.setBlocking = valueOrFunction => {
      let newValue;
      if (typeof valueOrFunction === 'function') {
        const func = valueOrFunction;
        synchronizable.lock();
        const prev = synchronizable.getBlocking();
        newValue = func(prev);
        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue));
        synchronizable.unlock();
      } else {
        const value = valueOrFunction;
        newValue = value;
        proxy.synchronizableSetBlocking(synchronizable, serializer(newValue));
      }
    };
    synchronizable.lock = () => {
      proxy.synchronizableLock(synchronizable);
    };
    synchronizable.unlock = () => {
      proxy.synchronizableUnlock(synchronizable);
    };
    return synchronizable;
  }
  globalThis.__synchronizableUnpacker = synchronizableUnpacker;
}
//# sourceMappingURL=synchronizableUnpacker.native.js.map
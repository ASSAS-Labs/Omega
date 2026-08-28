'use strict';

import { createSerializable } from './memory/serializable';
import { serializableMappingCache } from './memory/serializableMappingCache';
export function addGuardImplementation(fn, errorMessage) {
  const serializableGuard = createSerializable(function guardImplementation() {
    'worklet';

    throw new Error(`[Worklets] ${errorMessage}`);
  });
  serializableMappingCache.set(fn, serializableGuard);
}
export function addNoBundleModeGuardImplementation(fn) {
  const name = fn.name;
  addGuardImplementation(fn, `${name} cannot be called on Worklet Runtimes outside of the Bundle Mode.`);
}
//# sourceMappingURL=guardImplementation.native.js.map
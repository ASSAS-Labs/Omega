'use strict';

import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import { createSerializable } from './serializable';
export function createSynchronizable(initialValue) {
  const synchronizableRef = WorkletsModule.createSynchronizable(createSerializable(initialValue));
  return globalThis.__synchronizableUnpacker(synchronizableRef);
}
//# sourceMappingURL=synchronizable.native.js.map
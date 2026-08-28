'use strict';

import { createSerializable, isSerializableRef, makeShareable, makeShareableCloneOnUIRecursive } from './memory/serializable';
import { serializableMappingCache } from './memory/serializableMappingCache';

/** @deprecated Use {@link SerializableRef} instead. */

export { makeShareable, makeShareableCloneOnUIRecursive };

/** @deprecated It will be removed in the next major version. */

/** @deprecated Use {@link createSerializable} instead. */
export const makeShareableCloneRecursive = createSerializable;

/** @deprecated Use {@link isSerializableRef} instead. */
export const isShareableRef = isSerializableRef;

/** @deprecated Use {@link serializableMappingCache} instead. */
export const shareableMappingCache = serializableMappingCache;

/** @deprecated NOOP, don't use. */
export function callMicrotasks() {
  'worklet';

  // NOOP for backwards compatibility.
}
//# sourceMappingURL=deprecated.js.map
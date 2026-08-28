'use strict';

export function isSynchronizable(value) {
  'worklet';

  return typeof value === 'object' && value !== null && !!value.__synchronizableRef;
}
//# sourceMappingURL=isSynchronizable.js.map
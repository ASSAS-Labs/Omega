'use strict';

export function isShareable(value) {
  'worklet';

  return typeof value === 'object' && value !== null && !!value.__shareableRef;
}
//# sourceMappingURL=isShareable.js.map
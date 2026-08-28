"use strict";

import isEqual from 'fast-deep-equal';
import * as React from 'react';
export function useDeepStableValue(value) {
  const valueRef = React.useRef(value);
  if (!isEqual(valueRef.current, value)) {
    valueRef.current = value;
  }
  return valueRef.current;
}
//# sourceMappingURL=useDeepStableValue.js.map
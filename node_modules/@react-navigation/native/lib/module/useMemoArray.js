"use strict";

import * as React from 'react';
export function useMemoArray(entries) {
  const previousRef = React.useRef(undefined);
  const previous = previousRef.current;
  const next = entries.map(([item, deps], index) => {
    const previousEntry = previous?.entries[index];
    const depsEqual = previousEntry && previousEntry.deps.length === deps.length && previousEntry.deps.every((it, index) => Object.is(it, deps[index]));
    return depsEqual ? previousEntry : {
      item,
      deps
    };
  });
  if (previous && previous.entries.length === next.length && next.every((entry, index) => entry === previous.entries[index])) {
    return previous.items;
  }
  const items = next.map(entry => entry.item);
  previousRef.current = {
    entries: next,
    items
  };
  return items;
}
//# sourceMappingURL=useMemoArray.js.map
"use strict";

import * as React from 'react';
import useLatestCallback from 'use-latest-callback';
import { useClientLayoutEffect } from "./useClientLayoutEffect.js";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Hook to get a value from the current navigation state using a selector.
 *
 * @param selector Selector function to get a value from the state.
 */
export function useNavigationState(selector) {
  if (typeof selector !== 'function') {
    throw new Error(`A selector function must be provided (got ${typeof selector}).`);
  }
  const listener = React.useContext(NavigationStateListenerContext);
  if (listener == null) {
    throw new Error("Couldn't get the navigation state. Is your component inside a navigator?");
  }
  const {
    getState,
    subscribe
  } = listener;
  const [, forceUpdate] = React.useReducer(count => count + 1, 0);

  // @ts-expect-error: this is unsafe, but we need to support it for now
  const selected = selector(getState());
  const selectionRef = React.useRef({
    select: selector,
    selected
  });
  useClientLayoutEffect(() => {
    selectionRef.current = {
      select: selector,
      selected
    };
  });
  React.useEffect(() => {
    const checkForUpdates = () => {
      const selection = selectionRef.current;

      // @ts-expect-error: this is unsafe, but we need to support it for now
      if (!Object.is(selection.selected, selection.select(getState()))) {
        forceUpdate();
      }
    };
    const unsubscribe = subscribe(checkForUpdates);

    // The state may have changed between the render and the subscription
    checkForUpdates();
    return unsubscribe;
  }, [getState, subscribe]);
  return selected;
}
export function NavigationStateListenerProvider({
  state,
  getState,
  children
}) {
  const listeners = React.useRef([]);
  const subscribe = useLatestCallback(callback => {
    listeners.current.push(callback);
    return () => {
      listeners.current = listeners.current.filter(cb => cb !== callback);
    };
  });

  // Notify subscribers once the new state has committed
  useClientLayoutEffect(() => {
    listeners.current.forEach(callback => callback());
  }, [state]);
  const context = React.useMemo(() => ({
    getState,
    subscribe
  }), [getState, subscribe]);
  return /*#__PURE__*/_jsx(NavigationStateListenerContext.Provider, {
    value: context,
    children: children
  });
}
const NavigationStateListenerContext = /*#__PURE__*/React.createContext(undefined);
//# sourceMappingURL=useNavigationState.js.map
"use strict";

import { CommonActions } from '@react-navigation/routers';
import * as React from 'react';
import { NavigationContext } from "./NavigationContext.js";
import { PrivateValueStore } from "./types.js";
// This is to make TypeScript compiler happy
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
PrivateValueStore;
/**
 * Navigation object with helper methods to be used by a navigator.
 * This object includes methods for common actions as well as methods the parent screen's navigation object.
 */
export function useNavigationHelpers({
  id: navigatorId,
  onAction,
  onUnhandledAction,
  getState,
  state,
  emitter,
  router
}) {
  const parentNavigationHelpers = React.useContext(NavigationContext);

  // In some cases (e.g. route names change), internal state might have changed
  // But it hasn't been committed yet, so hasn't propagated to any listeners
  // During this time, we need to return the internal state in `getState`
  // Otherwise it can return an inconsistent state during render in children
  // This may affect hooks like `useNavigationState` that need to read the state during render
  // To avoid this, we use a ref for render phase, and immediately clear it on commit
  // The ref won't be cleared if the render is discarded, e.g. when interrupted
  // So we also track the stored state the render was based on
  // Then ignore the ref once the stored state changes due to another dispatch
  const stateRef = React.useRef(null);
  stateRef.current = {
    state,
    base: getState()
  };
  React.useInsertionEffect(() => {
    stateRef.current = null;
  });
  return React.useMemo(() => {
    const dispatch = op => {
      const action = typeof op === 'function' ? op(getState()) : op;
      const handled = onAction(action);
      if (!handled) {
        onUnhandledAction?.(action);
      }
    };
    const actions = {
      ...router.actionCreators,
      ...CommonActions
    };
    const helpers = Object.keys(actions).reduce((acc, name) => {
      // @ts-expect-error: name is a valid key, but TypeScript is dumb
      acc[name] = (...args) => dispatch(actions[name](...args));
      return acc;
    }, {});
    const navigationHelpers = {
      ...parentNavigationHelpers,
      ...helpers,
      dispatch,
      emit: emitter.emit,
      isFocused: parentNavigationHelpers ? parentNavigationHelpers.isFocused : () => true,
      canGoBack: () => {
        const state = getState();
        return router.getStateForAction(state, CommonActions.goBack(), {
          routeNames: state.routeNames,
          routeParamList: {},
          routeGetIdList: {}
        }) !== null || parentNavigationHelpers?.canGoBack() || false;
      },
      getId: () => navigatorId,
      getParent: id => {
        if (id !== undefined) {
          let current = navigationHelpers;
          while (current && id !== current.getId()) {
            current = current.getParent();
          }
          return current;
        }
        return parentNavigationHelpers;
      },
      getState: () => {
        const current = getState();
        const pending = stateRef.current;

        // FIXME: Workaround for when the state is read during render
        // Apart from subscriptions, `getState` should never be called during render
        if (pending != null && pending.base === current) {
          return pending.state;
        }
        return current;
      }
    };
    return navigationHelpers;
  }, [router, parentNavigationHelpers, emitter.emit, getState, onAction, onUnhandledAction, navigatorId, stateRef]);
}
//# sourceMappingURL=useNavigationHelpers.js.map
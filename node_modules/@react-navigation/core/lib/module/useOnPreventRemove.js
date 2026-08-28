"use strict";

import * as React from 'react';
import { NavigationBuilderContext } from "./NavigationBuilderContext.js";
import { NavigationRouteContext } from "./NavigationProvider.js";
const VISITED_ROUTE_KEYS = Symbol('VISITED_ROUTE_KEYS');
export const shouldPreventRemove = (emitter, beforeRemoveListeners, currentRoutes, nextRoutes, action) => {
  const nextRoutesByKey = new Map(nextRoutes.map(route => [route.key, route]).filter(([, route]) => route.key != null));
  const visitedRouteKeys = VISITED_ROUTE_KEYS in action && action[VISITED_ROUTE_KEYS] instanceof Set ? action[VISITED_ROUTE_KEYS] : new Set();
  const beforeRemoveAction = {
    ...action,
    [VISITED_ROUTE_KEYS]: visitedRouteKeys
  };

  // Call these in reverse order so last screens handle the event first
  const reversedCurrentRoutes = [...currentRoutes].reverse();
  for (const route of reversedCurrentRoutes) {
    if (visitedRouteKeys.has(route.key)) {
      // Skip if we've already emitted this action for this screen
      continue;
    }
    if (!nextRoutesByKey.has(route.key)) {
      // The route is not in next state, so it's being removed
      // First, we need to check if any child screens want to prevent it
      const isPrevented = beforeRemoveListeners[route.key]?.(beforeRemoveAction, undefined);
      if (isPrevented) {
        return true;
      }
      visitedRouteKeys.add(route.key);
      const event = emitter.emit({
        type: 'beforeRemove',
        target: route.key,
        data: {
          action: beforeRemoveAction
        },
        canPreventDefault: true
      });
      if (event.defaultPrevented) {
        return true;
      }
    } else {
      // The route is kept but its nested state changed, so propagate the check into the nested navigator
      const nextRoute = nextRoutesByKey.get(route.key);
      if (route.state != null && route.state !== nextRoute?.state) {
        const isPrevented = beforeRemoveListeners[route.key]?.(beforeRemoveAction, nextRoute?.state);
        if (isPrevented) {
          return true;
        }
      }
    }
  }
  return false;
};
export function useOnPreventRemove({
  getState,
  emitter,
  beforeRemoveListeners
}) {
  const {
    addKeyedListener
  } = React.useContext(NavigationBuilderContext);
  const route = React.useContext(NavigationRouteContext);
  const routeKey = route?.key;
  React.useEffect(() => {
    if (routeKey) {
      return addKeyedListener?.('beforeRemove', routeKey, (action, nextState) => {
        const state = getState();
        return shouldPreventRemove(emitter, beforeRemoveListeners, state.routes, nextState?.routes ?? [], action);
      });
    }
  }, [addKeyedListener, beforeRemoveListeners, emitter, getState, routeKey]);
}
//# sourceMappingURL=useOnPreventRemove.js.map
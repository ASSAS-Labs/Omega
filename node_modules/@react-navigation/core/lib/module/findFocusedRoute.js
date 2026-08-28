"use strict";

export function findFocusedRoute(state) {
  let current = state;
  while (current?.routes[current.index ?? current.routes.length - 1]?.state != null) {
    current = current.routes[current.index ?? current.routes.length - 1]?.state;
  }
  const route = current?.routes[current?.index ?? current.routes.length - 1];
  return route;
}
//# sourceMappingURL=findFocusedRoute.js.map
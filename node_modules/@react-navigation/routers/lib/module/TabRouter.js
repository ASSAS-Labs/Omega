"use strict";

import { SwitchRouter } from "./SwitchRouter.js";
export const TabActions = {
  jumpTo(name, params) {
    return {
      type: 'JUMP_TO',
      payload: {
        name,
        params
      }
    };
  }
};
export function TabRouter(options) {
  const router = SwitchRouter(options);
  return {
    ...router,
    type: 'tab',
    getInitialState(routerOptions) {
      const state = router.getInitialState(routerOptions);
      return {
        ...state,
        type: 'tab',
        key: `tab-${state.key}`
      };
    },
    getRehydratedState(partialState, routerOptions) {
      if (partialState.stale === false) {
        return partialState;
      }
      const state = router.getRehydratedState(partialState, routerOptions);
      return {
        ...state,
        type: 'tab',
        key: `tab-${state.key}`
      };
    },
    actionCreators: TabActions
  };
}
//# sourceMappingURL=TabRouter.js.map
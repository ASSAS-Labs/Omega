import type { CommonNavigationAction, DefaultRouterOptions, NavigationState, PartialState, RouterConfigOptions } from './types.js';
export type SwitchActionType = {
    type: 'JUMP_TO';
    payload: {
        name: string;
        params?: object;
    };
    source?: string;
    target?: string;
};
export type SwitchRouterOptions = DefaultRouterOptions & {
    /**
     * Control how going back should behave
     * - `firstRoute` - return to the first defined route
     * - `initialRoute` - return to the route from `initialRouteName`
     * - `order` - return to the route defined before the focused route
     * - `history` - return to last visited route; if the same route is visited multiple times, the older entries are dropped from the history
     * - `fullHistory` - return to last visited route; doesn't drop duplicate entries unlike `history` - matches behavior of web pages
     * - `none` - do not handle going back
     */
    backBehavior?: BackBehavior;
};
type BackBehavior = 'firstRoute' | 'initialRoute' | 'order' | 'history' | 'fullHistory' | 'none';
type RouteHistory = {
    type: 'route';
    key: string;
    params?: object | undefined;
};
type DrawerHistory = {
    type: 'drawer';
    status: 'open' | 'closed';
};
type SwitchRouterState<History> = Omit<NavigationState, 'history' | 'type'> & {
    history: History[];
    preloadedRouteKeys: string[];
};
type SwitchRouterStateMap = {
    tab: SwitchRouterState<RouteHistory> & {
        type: 'tab';
    };
    drawer: SwitchRouterState<RouteHistory | DrawerHistory> & {
        type: 'drawer';
        default: DrawerHistory['status'];
    };
};
type SwitchRouterType = 'tab' | 'drawer';
export declare function SwitchRouter<Type extends SwitchRouterType>({ initialRouteName, backBehavior, }: SwitchRouterOptions): {
    shouldActionChangeFocus(action: CommonNavigationAction): action is {
        type: "NAVIGATE";
        payload: {
            name: string;
            params?: object;
            path?: string;
            merge?: boolean;
            pop?: boolean;
        };
        source?: string;
        target?: string;
    } | {
        type: "NAVIGATE_DEPRECATED";
        payload: {
            name: string;
            params?: object;
            merge?: boolean;
        };
        source?: string;
        target?: string;
    };
    getInitialState({ routeNames, routeParamList, }: RouterConfigOptions): SwitchRouterState<RouteHistory>;
    getRehydratedState(state: PartialState<SwitchRouterStateMap[Type]>, { routeNames, routeParamList }: RouterConfigOptions): SwitchRouterState<RouteHistory>;
    getStateForRouteNamesChange(state: SwitchRouterStateMap[Type], { routeNames, routeParamList, routeKeyChanges, }: RouterConfigOptions & {
        routeKeyChanges: string[];
    }): SwitchRouterStateMap[Type];
    getStateForRouteFocus(state: SwitchRouterStateMap[Type], key: string): SwitchRouterStateMap[Type];
    getStateForAction(state: SwitchRouterStateMap[Type], action: SwitchActionType | CommonNavigationAction, { routeParamList, routeGetIdList }: RouterConfigOptions): SwitchRouterStateMap[Type] | PartialState<SwitchRouterStateMap[Type]> | null;
};
export {};
//# sourceMappingURL=SwitchRouter.d.ts.map
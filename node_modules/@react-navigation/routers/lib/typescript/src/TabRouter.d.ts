import { type SwitchActionType as TabActionType, type SwitchRouterOptions as TabRouterOptions } from './SwitchRouter.js';
import type { CommonNavigationAction, NavigationState, ParamListBase, Router } from './types.js';
export type { TabActionType, TabRouterOptions };
export type TabNavigationState<ParamList extends ParamListBase> = Omit<NavigationState<ParamList>, 'history'> & {
    /**
     * Type of the router, in this case, it's tab.
     */
    type: 'tab';
    /**
     * List of previously visited route keys.
     */
    history: {
        type: 'route';
        key: string;
        params?: object | undefined;
    }[];
    /**
     * List of routes' key, which are supposed to be preloaded before navigating to.
     */
    preloadedRouteKeys: string[];
};
export type TabActionHelpers<ParamList extends ParamListBase> = {
    /**
     * Jump to an existing tab.
     *
     * @param screen Name of the route to jump to.
     * @param [params] Params object for the route.
     */
    jumpTo<RouteName extends keyof ParamList>(...args: RouteName extends unknown ? undefined extends ParamList[RouteName] ? [screen: RouteName, params?: ParamList[RouteName]] : [screen: RouteName, params: ParamList[RouteName]] : never): void;
};
export declare const TabActions: {
    jumpTo(name: string, params?: object): {
        readonly type: "JUMP_TO";
        readonly payload: {
            readonly name: string;
            readonly params: object | undefined;
        };
    };
};
export declare function TabRouter(options: TabRouterOptions): Router<TabNavigationState<ParamListBase>, TabActionType | CommonNavigationAction>;
//# sourceMappingURL=TabRouter.d.ts.map
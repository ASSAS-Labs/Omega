import type { NavigationState, ParamListBase } from '@react-navigation/routers';
import * as React from 'react';
import type { DefaultNavigatorOptions, EventMapBase, NavigationListBase, NavigatorScreenParams, NavigatorTypeBagBase, PathConfig, PathConfigMap, RouteConfigComponent, RouteConfigProps, RouteGroupConfig, StaticParamList } from './types.js';
export type { StaticParamList } from './types.js';
type StaticRouteConfig<ParamList extends ParamListBase, RouteName extends keyof ParamList, State extends NavigationState, ScreenOptions extends {}, EventMap extends EventMapBase, Navigation> = RouteConfigProps<ParamList, RouteName, State, ScreenOptions, EventMap, Navigation> & RouteConfigComponent<ParamList, RouteName>;
type StaticScreenConfigBrand = {
    readonly __reactNavigationStaticScreenConfig: true;
};
type UnknownToUndefined<T> = unknown extends T ? undefined : T;
type ParamsForStaticScreenComponent<T> = T extends React.ComponentType<{
    route: {
        params: infer P;
    };
}> ? UnknownToUndefined<P> : undefined;
type ParamsForStaticScreen<T> = T extends StaticNavigation<any, any, any> ? NavigatorScreenParams<StaticParamList<T>> | undefined : ParamsForStaticScreenComponent<T>;
type ParamListForStaticScreenConfig<Params> = {
    [key: string]: Params extends object | undefined ? Params : never;
};
type StaticScreenConfigLinking = PathConfig<ParamListBase> | string | null | undefined;
type StaticScreenConfigScreen = React.ComponentType<any> | StaticNavigation<any, any, any>;
type StaticScreenConfig<Screen extends StaticScreenConfigScreen, State extends NavigationState, ScreenOptions extends {}, EventMap extends EventMapBase, Navigation, Params = ParamsForStaticScreen<Screen>> = Omit<StaticRouteConfig<ParamListForStaticScreenConfig<Params>, string, State, ScreenOptions, EventMap, Navigation>, 'name' | 'component' | 'getComponent' | 'children'> & {
    /**
     * Callback to determine whether the screen should be rendered or not.
     * This can be useful for conditional rendering of screens,
     * e.g. - if you want to render a different screen for logged in users.
     *
     * You can use a custom hook to use custom logic to determine the return value.
     *
     * @example
     * ```js
     * if: useIsLoggedIn
     * ```
     */
    if?: () => boolean;
    /**
     * Linking config for the screen.
     * This can be a string to specify the path, or an object with more options.
     *
     * @example
     * ```js
     * linking: {
     *   path: 'profile/:id',
     *   exact: true,
     * },
     * ```
     */
    linking?: StaticScreenConfigLinking;
    /**
     * Static navigation config or Component to render for the screen.
     */
    screen: Screen;
};
export type StaticConfigScreens<ParamList extends ParamListBase, State extends NavigationState, ScreenOptions extends {}, EventMap extends EventMapBase, NavigationList extends NavigationListBase<ParamList>> = {
    [RouteName in keyof ParamList]: React.ComponentType<any> | StaticNavigation<any, any, any> | (Omit<StaticRouteConfig<ParamList, RouteName, State, ScreenOptions, EventMap, NavigationList[RouteName]>, 'name' | 'component' | 'getComponent' | 'children'> & {
        /**
         * Callback to determine whether the screen should be rendered or not.
         * This can be useful for conditional rendering of screens,
         * e.g. - if you want to render a different screen for logged in users.
         *
         * You can use a custom hook to use custom logic to determine the return value.
         *
         * @example
         * ```js
         * if: useIsLoggedIn
         * ```
         */
        if?: () => boolean;
        /**
         * Linking config for the screen.
         * This can be a string to specify the path, or an object with more options.
         *
         * @example
         * ```js
         * linking: {
         *   path: 'profile/:id',
         *   exact: true,
         * },
         * ```
         */
        linking?: PathConfig<ParamListBase> | string | null;
        /**
         * Static navigation config or Component to render for the screen.
         */
        screen: StaticNavigation<any, any, any> | React.ComponentType<any>;
    }) | StaticScreenConfigBranded;
};
type StaticScreenConfigBranded = StaticScreenConfigBrand & {
    screen: StaticScreenConfigScreen;
    if?: () => boolean;
};
export type StaticConfigGroup<ParamList extends ParamListBase, State extends NavigationState, ScreenOptions extends {}, EventMap extends EventMapBase, NavigationList extends NavigationListBase<ParamList>> = Omit<RouteGroupConfig<ParamList, ScreenOptions, NavigationList[keyof ParamList]>, 'screens' | 'children'> & {
    /**
     * Callback to determine whether the screens in the group should be rendered or not.
     * This can be useful for conditional rendering of group of screens.
     */
    if?: () => boolean;
    /**
     * Static navigation config or Component to render for the screen.
     */
    screens: StaticConfigScreens<ParamList, State, ScreenOptions, EventMap, NavigationList>;
};
export type StaticConfig<Bag extends NavigatorTypeBagBase> = StaticConfigInternal<Bag['ParamList'], Bag['NavigatorID'], Bag['State'], Bag['ScreenOptions'], Bag['EventMap'], Bag['NavigationList'], Bag['Navigator']>;
type StaticConfigInternal<ParamList extends ParamListBase, NavigatorID extends string | undefined, State extends NavigationState, ScreenOptions extends {}, EventMap extends EventMapBase, NavigationList extends NavigationListBase<ParamList>, Navigator extends React.ComponentType<any>> = Omit<Omit<React.ComponentProps<Navigator>, keyof DefaultNavigatorOptions<ParamListBase, string | undefined, NavigationState, {}, EventMapBase, NavigationList[keyof ParamList]>> & DefaultNavigatorOptions<ParamList, NavigatorID, State, ScreenOptions, EventMap, NavigationList[keyof ParamList]>, 'screens' | 'children'> & ({
    /**
     * Screens to render in the navigator and their configuration.
     */
    screens: StaticConfigScreens<ParamList, State, ScreenOptions, EventMap, NavigationList>;
    /**
     * Groups of screens to render in the navigator and their configuration.
     */
    groups?: {
        [key: string]: StaticConfigGroup<ParamList, State, ScreenOptions, EventMap, NavigationList>;
    };
} | {
    /**
     * Screens to render in the navigator and their configuration.
     */
    screens?: StaticConfigScreens<ParamList, State, ScreenOptions, EventMap, NavigationList>;
    /**
     * Groups of screens to render in the navigator and their configuration.
     */
    groups: {
        [key: string]: StaticConfigGroup<ParamList, State, ScreenOptions, EventMap, NavigationList>;
    };
});
/**
 * Props for a screen component which is rendered by a static navigator.
 * Takes the route params as a generic argument.
 */
export type StaticScreenProps<T extends Record<string, unknown> | undefined> = {
    route: {
        params: T;
    };
};
type StaticNavigationBase = {
    config: StaticConfig<NavigatorTypeBagBase>;
    getComponent: () => React.ComponentType<{}>;
};
export type StaticNavigation<NavigatorProps, GroupProps, ScreenProps> = StaticNavigationBase & {
    Navigator: React.ComponentType<NavigatorProps>;
    Group: React.ComponentType<GroupProps>;
    Screen: React.ComponentType<ScreenProps>;
};
export type StaticScreenFactory<Bag extends NavigatorTypeBagBase> = <const Screen extends StaticScreenConfigScreen>(config: StaticScreenConfig<Screen, Bag['State'], Bag['ScreenOptions'], Bag['EventMap'], Bag['NavigationList'][keyof Bag['ParamList']]>) => StaticScreenConfig<Screen, Bag['State'], Bag['ScreenOptions'], Bag['EventMap'], Bag['NavigationList'][keyof Bag['ParamList']]> & StaticScreenConfigBrand;
/**
 * Helper to create a typed `createXScreen` for static configuration.
 */
export declare function createScreenFactory<TypeBag extends NavigatorTypeBagBase>(): StaticScreenFactory<TypeBag>;
/**
 * Create a component that renders a navigator based on the static configuration.
 *
 * @param tree Static navigation config.
 * @param displayName Name of the component to be displayed in React DevTools.
 * @returns A component which renders the navigator.
 */
export declare function createComponentForStaticNavigation<T extends {
    Navigator: React.ComponentType<any>;
    Group: React.ComponentType<any>;
    Screen: React.ComponentType<any>;
    config: StaticConfig<NavigatorTypeBagBase>;
}>(tree: T, displayName: string): React.ComponentType<Omit<React.ComponentProps<T['Navigator']>, 'children'>>;
/**
 * Create a component that renders a navigator based on the static configuration.
 *
 * @deprecated Use `tree.getComponent()` instead.
 */
export declare function createComponentForStaticNavigationDeprecated(tree: StaticNavigation<any, any, any>): React.ComponentType<{}>;
type TreeForPathConfig = {
    config: ConfigForPathConfig;
};
type ConfigForPathConfig = {
    initialRouteName?: string;
    screens?: Record<string, ScreenForPathConfig>;
    groups?: {
        [key: string]: {
            screens: Record<string, ScreenForPathConfig>;
        };
    };
};
type LinkingForPathConfig = PathConfig<ParamListBase> | string | null | undefined;
type ScreenForPathConfig = React.ComponentType<any> | TreeForPathConfig | {
    screen: React.ComponentType<any> | TreeForPathConfig;
    linking?: LinkingForPathConfig;
};
/**
 * Create a path config object from a static navigation config for deep linking.
 *
 * @param tree Static navigation config.
 * @param options Additional options from `linking.config`.
 * @param auto Whether to automatically generate paths for leaf screens.
 * @returns Path config object to use in linking config.
 *
 * @example
 * ```js
 * const config = {
 *   screens: {
 *     Home: {
 *       screens: createPathConfigForStaticNavigation(HomeTabs),
 *     },
 *   },
 * };
 * ```
 */
export declare function createPathConfigForStaticNavigation(tree: TreeForPathConfig, options?: {
    initialRouteName?: string;
}, auto?: boolean): PathConfigMap<ParamListBase> | undefined;
//# sourceMappingURL=StaticNavigation.d.ts.map
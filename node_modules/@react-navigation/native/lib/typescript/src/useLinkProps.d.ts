import { type NavigationAction } from '@react-navigation/core';
import * as React from 'react';
import { type GestureResponderEvent } from 'react-native';
export type LinkProps<ParamList extends ReactNavigation.RootParamList, RouteName extends keyof ParamList = keyof ParamList> = ({
    href?: string;
    action?: NavigationAction;
} & (RouteName extends unknown ? undefined extends ParamList[RouteName] ? {
    screen: RouteName;
    params?: ParamList[RouteName];
} : {
    screen: RouteName;
    params: ParamList[RouteName];
} : never)) | {
    href?: string;
    action: NavigationAction;
    screen?: undefined;
    params?: undefined;
};
/**
 * Hook to get props for an anchor tag so it can work with in page navigation.
 *
 * @param props.screen Name of the screen to navigate to (e.g. `'Feeds'`).
 * @param props.params Params to pass to the screen to navigate to (e.g. `{ sort: 'hot' }`).
 * @param props.href Optional absolute path to use for the href (e.g. `/feeds/hot`).
 * @param props.action Optional action to override the in-page navigation. The `href` is still derived from `screen`, so this can be used to render a link while dispatching a different action (e.g. a `replace`).
 */
export declare function useLinkProps<ParamList extends ReactNavigation.RootParamList>({ screen, params, action, ...rest }: LinkProps<ParamList>): {
    href: string | ({
        href?: string;
        action?: NavigationAction;
    } & (keyof ParamList extends infer T ? T extends keyof ParamList ? T extends unknown ? undefined extends ParamList[T] ? {
        screen: T;
        params?: ParamList[T] | undefined;
    } : {
        screen: T;
        params: ParamList[T];
    } : never : never : never))["href"] | undefined;
    role: "link";
    onPress: (e?: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent) => void;
};
//# sourceMappingURL=useLinkProps.d.ts.map
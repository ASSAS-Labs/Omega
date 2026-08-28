import { type NavigatorTypeBagBase, type ParamListBase, type StaticConfig, type TabNavigationState, type TypedNavigator } from '@react-navigation/native';
import * as React from 'react';
import type { NativeBottomTabNavigationEventMap, NativeBottomTabNavigationOptions, NativeBottomTabNavigationProp, NativeBottomTabNavigatorProps } from './types.js';
declare function NativeBottomTabNavigator({ id, initialRouteName, backBehavior, children, layout, screenListeners, screenOptions, screenLayout, UNSTABLE_router, UNSTABLE_routeNamesChangeBehavior, ...rest }: NativeBottomTabNavigatorProps): React.JSX.Element;
export type NativeBottomTabTypeBag<ParamList extends ParamListBase = ParamListBase, NavigatorID extends string | undefined = string | undefined> = {
    ParamList: ParamList;
    NavigatorID: NavigatorID;
    State: TabNavigationState<ParamList>;
    ScreenOptions: NativeBottomTabNavigationOptions;
    EventMap: NativeBottomTabNavigationEventMap;
    NavigationList: {
        [RouteName in keyof ParamList]: NativeBottomTabNavigationProp<ParamList, RouteName, NavigatorID>;
    };
    Navigator: typeof NativeBottomTabNavigator;
};
export declare function createNativeBottomTabNavigator<const ParamList extends ParamListBase, const NavigatorID extends string | undefined = string | undefined, const TypeBag extends NavigatorTypeBagBase = NativeBottomTabTypeBag<ParamList, NavigatorID>, const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>>(config?: Config): TypedNavigator<TypeBag, Config>;
export declare const createNativeBottomTabScreen: import("@react-navigation/core").StaticScreenFactory<NativeBottomTabTypeBag<ParamListBase, string | undefined>>;
export {};
//# sourceMappingURL=createNativeBottomTabNavigator.native.d.ts.map
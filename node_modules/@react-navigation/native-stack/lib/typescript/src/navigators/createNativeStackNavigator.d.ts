import { type NavigatorTypeBagBase, type ParamListBase, type StackNavigationState, type StaticConfig, type TypedNavigator } from '@react-navigation/native';
import * as React from 'react';
import type { NativeStackNavigationEventMap, NativeStackNavigationOptions, NativeStackNavigationProp, NativeStackNavigatorProps } from '../types.js';
declare function NativeStackNavigator({ id, initialRouteName, UNSTABLE_routeNamesChangeBehavior, children, layout, screenListeners, screenOptions, screenLayout, UNSTABLE_router, ...rest }: NativeStackNavigatorProps): React.JSX.Element;
export type NativeStackTypeBag<ParamList extends ParamListBase = ParamListBase, NavigatorID extends string | undefined = string | undefined> = {
    ParamList: ParamList;
    NavigatorID: NavigatorID;
    State: StackNavigationState<ParamList>;
    ScreenOptions: NativeStackNavigationOptions;
    EventMap: NativeStackNavigationEventMap;
    NavigationList: {
        [RouteName in keyof ParamList]: NativeStackNavigationProp<ParamList, RouteName, NavigatorID>;
    };
    Navigator: typeof NativeStackNavigator;
};
export declare function createNativeStackNavigator<const ParamList extends ParamListBase, const NavigatorID extends string | undefined = string | undefined, const TypeBag extends NavigatorTypeBagBase = NativeStackTypeBag<ParamList, NavigatorID>, const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>>(config?: Config): TypedNavigator<TypeBag, Config>;
export declare const createNativeStackScreen: import("@react-navigation/core").StaticScreenFactory<NativeStackTypeBag<ParamListBase, string | undefined>>;
export {};
//# sourceMappingURL=createNativeStackNavigator.d.ts.map
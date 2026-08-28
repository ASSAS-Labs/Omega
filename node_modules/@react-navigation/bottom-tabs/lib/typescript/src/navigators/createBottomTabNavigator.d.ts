import { type NavigatorTypeBagBase, type ParamListBase, type StaticConfig, type TabNavigationState, type TypedNavigator } from '@react-navigation/native';
import type { BottomTabNavigationEventMap, BottomTabNavigationOptions, BottomTabNavigationProp, BottomTabNavigatorProps } from '../types.js';
declare function BottomTabNavigator({ id, initialRouteName, backBehavior, UNSTABLE_routeNamesChangeBehavior, children, layout, screenListeners, screenOptions, screenLayout, UNSTABLE_router, ...rest }: BottomTabNavigatorProps): import("react").JSX.Element;
export type BottomTabTypeBag<ParamList extends ParamListBase = ParamListBase, NavigatorID extends string | undefined = string | undefined> = {
    ParamList: ParamList;
    NavigatorID: NavigatorID;
    State: TabNavigationState<ParamList>;
    ScreenOptions: BottomTabNavigationOptions;
    EventMap: BottomTabNavigationEventMap;
    NavigationList: {
        [RouteName in keyof ParamList]: BottomTabNavigationProp<ParamList, RouteName, NavigatorID>;
    };
    Navigator: typeof BottomTabNavigator;
};
export declare function createBottomTabNavigator<const ParamList extends ParamListBase, const NavigatorID extends string | undefined = string | undefined, const TypeBag extends NavigatorTypeBagBase = BottomTabTypeBag<ParamList, NavigatorID>, const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>>(config?: Config): TypedNavigator<TypeBag, Config>;
export declare const createBottomTabScreen: import("@react-navigation/core").StaticScreenFactory<BottomTabTypeBag<ParamListBase, string | undefined>>;
export {};
//# sourceMappingURL=createBottomTabNavigator.d.ts.map
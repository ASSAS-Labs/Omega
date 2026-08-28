import { type DefaultRouterOptions, type EventMapBase, type NavigationAction, type NavigationProp, type NavigatorTypeBagBase, type ParamListBase, type RouterFactory, type StaticConfig, type StaticParamList, type StaticScreenFactory, type TypedNavigator } from '@react-navigation/core';
import * as React from 'react';
import type { createStandardNavigator } from 'standard-navigation';
type StandardEventMap<EventMap extends EventMapBase> = {
    [EventName in keyof EventMap]: {
        data: EventMap[EventName] extends {
            data?: infer Data;
        } ? Data extends object | undefined ? Data : object | undefined : undefined;
        canPreventDefault: EventMap[EventName] extends {
            canPreventDefault: true;
        } ? true : false;
    };
};
type ActionHelpersOf<T> = T extends Record<string, (...args: never[]) => unknown> ? T : {};
type StandardNavigationTypeBagFor<TypeBag extends StandardNavigationTypeBagBase, ParamList extends ParamListBase, NavigatorID extends string | undefined = string | undefined, NavigatorProps extends object = {}> = TypeBag & {
    ParamList: ParamList;
    NavigatorID: NavigatorID;
    Navigator: React.ComponentType<NavigatorProps>;
};
type StandardNavigation<TypeBag extends StandardNavigationTypeBagBase> = StandardNavigationTypeBagFor<TypeBag, ParamListBase>['NavigationList'][keyof StandardNavigationTypeBagFor<TypeBag, ParamListBase>['NavigationList']];
type StandardNavigationPropsMapper<TypeBag extends StandardNavigationTypeBagBase, MapperProps extends object> = (props: {
    state: StandardNavigationTypeBagFor<TypeBag, ParamListBase>['State'];
    navigation: StandardNavigation<TypeBag>;
}) => MapperProps;
type StandardNavigationDefaultBag<TypeBag extends StandardNavigationTypeBagBase, NavigatorProps extends object> = StandardNavigationTypeBagFor<TypeBag, ParamListBase, string | undefined, NavigatorProps>;
type StandardNavigationFactories<TypeBag extends StandardNavigationTypeBagBase, NavigatorProps extends object> = {
    createNavigator: StandardNavigationCreateNavigator<TypeBag, NavigatorProps>;
    createScreen: StaticScreenFactory<StandardNavigationDefaultBag<TypeBag, NavigatorProps>>;
};
export type StandardNavigationCreateNavigator<TypeBag extends StandardNavigationTypeBagBase, NavigatorProps extends object> = {
    <const ParamList extends ParamListBase, const NavigatorID extends string | undefined = string | undefined>(): TypedNavigator<StandardNavigationTypeBagFor<TypeBag, ParamList, NavigatorID, NavigatorProps>, undefined>;
    <const Config extends StaticConfig<StandardNavigationDefaultBag<TypeBag, NavigatorProps>>>(config: Config & StaticConfig<StandardNavigationDefaultBag<TypeBag, NavigatorProps>>): TypedNavigator<StandardNavigationTypeBagFor<TypeBag, StaticParamList<{
        config: Config;
    }> & ParamListBase, string | undefined, NavigatorProps>, Config>;
};
export interface StandardNavigationTypeBagBase extends NavigatorTypeBagBase {
    ActionHelpers: {};
    ScreenOptions: {};
    EventMap: EventMapBase;
    RouterOptions: DefaultRouterOptions;
    NavigationList: {
        [RouteName in keyof this['ParamList']]: NavigationProp<this['ParamList'], RouteName, this['NavigatorID'], this['State'], this['ScreenOptions'], this['EventMap']> & ActionHelpersOf<this['ActionHelpers']>;
    };
    Navigator: React.ComponentType<{}>;
}
export declare function createStandardNavigationFactories<TypeBag extends StandardNavigationTypeBagBase, NavigatorProps extends object = {}, MapperProps extends object = {}>(navigator: ReturnType<typeof createStandardNavigator<TypeBag['ScreenOptions'], StandardEventMap<TypeBag['EventMap']>, NavigatorProps & MapperProps>>, router: RouterFactory<StandardNavigationTypeBagFor<TypeBag, ParamListBase>['State'], NavigationAction, TypeBag['RouterOptions']>, mapper?: StandardNavigationPropsMapper<TypeBag, MapperProps>): StandardNavigationFactories<TypeBag, NavigatorProps>;
export {};
//# sourceMappingURL=createStandardNavigationFactories.d.ts.map
import { type ParamListBase, type TabNavigationState } from '@react-navigation/native';
import * as React from 'react';
import type { NativeBottomTabDescriptorMap, NativeBottomTabNavigationConfig, NativeBottomTabNavigationHelpers } from './types.js';
type Props = NativeBottomTabNavigationConfig & {
    state: TabNavigationState<ParamListBase>;
    navigation: NativeBottomTabNavigationHelpers;
    descriptors: NativeBottomTabDescriptorMap;
};
export declare function NativeBottomTabView({ state, navigation, descriptors }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=NativeBottomTabView.native.d.ts.map
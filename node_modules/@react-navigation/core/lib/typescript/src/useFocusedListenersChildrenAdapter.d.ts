import type { ParamListBase } from '@react-navigation/routers';
import { type FocusedNavigationListener } from './NavigationBuilderContext.js';
import type { NavigationHelpers } from './types.js';
type Options = {
    navigation: NavigationHelpers<ParamListBase>;
    focusedListeners: FocusedNavigationListener[];
};
/**
 * Hook for passing focus callback to children
 */
export declare function useFocusedListenersChildrenAdapter({ navigation, focusedListeners, }: Options): void;
export {};
//# sourceMappingURL=useFocusedListenersChildrenAdapter.d.ts.map
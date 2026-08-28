import type { NavigationAction, NavigationRoute, NavigationState, ParamListBase, PartialRoute } from '@react-navigation/routers';
import { type ChildBeforeRemoveListener } from './NavigationBuilderContext.js';
import type { EventMapCore } from './types.js';
import type { NavigationEventEmitter } from './useEventEmitter.js';
type Options = {
    getState: () => NavigationState;
    emitter: NavigationEventEmitter<EventMapCore<any>>;
    beforeRemoveListeners: Record<string, ChildBeforeRemoveListener | undefined>;
};
export declare const shouldPreventRemove: (emitter: NavigationEventEmitter<EventMapCore<any>>, beforeRemoveListeners: Record<string, ChildBeforeRemoveListener | undefined>, currentRoutes: NavigationRoute<ParamListBase, string>[], nextRoutes: (NavigationRoute<ParamListBase, string> | PartialRoute<NavigationRoute<ParamListBase, string>>)[], action: NavigationAction) => boolean;
export declare function useOnPreventRemove({ getState, emitter, beforeRemoveListeners, }: Options): void;
export {};
//# sourceMappingURL=useOnPreventRemove.d.ts.map
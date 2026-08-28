import type { KeyedListenerMap } from './NavigationBuilderContext.js';
/**
 * Hook which lets child navigators add getters to be called for obtaining rehydrated state.
 */
export declare function useKeyedChildListeners(): {
    keyedListeners: {
        getState: Record<string, import("./NavigationBuilderContext.js").GetStateListener | undefined>;
        beforeRemove: Record<string, import("./NavigationBuilderContext.js").ChildBeforeRemoveListener | undefined>;
    };
    addKeyedListener: <T extends keyof KeyedListenerMap>(type: T, key: string, listener: KeyedListenerMap[T]) => () => void;
};
//# sourceMappingURL=useKeyedChildListeners.d.ts.map
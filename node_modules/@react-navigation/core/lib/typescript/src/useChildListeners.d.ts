import type { ListenerMap } from './NavigationBuilderContext.js';
/**
 * Hook which lets child navigators add action listeners.
 */
export declare function useChildListeners(): {
    listeners: {
        action: import("./NavigationBuilderContext.js").ChildActionListener[];
        focus: import("./NavigationBuilderContext.js").FocusedNavigationListener[];
    };
    addListener: <T extends keyof ListenerMap>(type: T, listener: ListenerMap[T]) => () => void;
};
//# sourceMappingURL=useChildListeners.d.ts.map
import { type NavigationContainerRef, type ParamListBase } from '@react-navigation/core';
import * as React from 'react';
import type { LinkingOptions } from './types.js';
type Options = LinkingOptions<ParamListBase>;
export declare function useLinking(ref: React.RefObject<NavigationContainerRef<ParamListBase> | null>, { enabled, prefixes, filter, config, getInitialURL, subscribe, getStateFromPath, getActionFromState, }: Options): {
    getInitialState: () => PromiseLike<(Partial<Omit<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[];
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>, "routes" | "stale">> & Readonly<{
        stale?: true;
        routes: import("@react-navigation/routers").PartialRoute<import("@react-navigation/routers").Route<string, object | undefined>>[];
    }> & {
        state?: Partial<Omit<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>, "routes" | "stale">> & Readonly<{
            stale?: true;
            routes: import("@react-navigation/routers").PartialRoute<import("@react-navigation/routers").Route<string, object | undefined>>[];
        }> & /*elided*/ any;
    }) | undefined>;
};
export {};
//# sourceMappingURL=useLinking.native.d.ts.map
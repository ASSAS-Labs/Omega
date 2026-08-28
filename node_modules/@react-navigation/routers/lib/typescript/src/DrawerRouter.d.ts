import { type TabActionHelpers, type TabActionType, type TabNavigationState, type TabRouterOptions } from './TabRouter.js';
import type { CommonNavigationAction, ParamListBase, Router } from './types.js';
export type DrawerStatus = 'open' | 'closed';
export type DrawerActionType = TabActionType | {
    type: 'OPEN_DRAWER' | 'CLOSE_DRAWER' | 'TOGGLE_DRAWER';
    source?: string;
    target?: string;
};
export type DrawerRouterOptions = TabRouterOptions & {
    defaultStatus?: DrawerStatus;
};
export type DrawerNavigationState<ParamList extends ParamListBase> = Omit<TabNavigationState<ParamList>, 'type' | 'history'> & {
    /**
     * Type of the router, in this case, it's drawer.
     */
    type: 'drawer';
    /**
     * Default status of the drawer.
     */
    default: DrawerStatus;
    /**
     * List of previously visited route keys and drawer open status.
     */
    history: ({
        type: 'route';
        key: string;
        params?: object | undefined;
    } | {
        type: 'drawer';
        status: DrawerStatus;
    })[];
};
export type DrawerActionHelpers<ParamList extends ParamListBase> = TabActionHelpers<ParamList> & {
    /**
     * Open the drawer sidebar.
     */
    openDrawer(): void;
    /**
     * Close the drawer sidebar.
     */
    closeDrawer(): void;
    /**
     * Open the drawer sidebar if closed, or close if opened.
     */
    toggleDrawer(): void;
};
export declare const DrawerActions: {
    jumpTo(name: string, params?: object): {
        readonly type: "JUMP_TO";
        readonly payload: {
            readonly name: string;
            readonly params: object | undefined;
        };
    };
    openDrawer(): {
        readonly type: "OPEN_DRAWER";
    };
    closeDrawer(): {
        readonly type: "CLOSE_DRAWER";
    };
    toggleDrawer(): {
        readonly type: "TOGGLE_DRAWER";
    };
};
export declare function DrawerRouter({ defaultStatus, ...rest }: DrawerRouterOptions): Router<DrawerNavigationState<ParamListBase>, DrawerActionType | CommonNavigationAction>;
//# sourceMappingURL=DrawerRouter.d.ts.map
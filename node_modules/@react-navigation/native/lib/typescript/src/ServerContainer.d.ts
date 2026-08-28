import * as React from 'react';
import { type ServerContextType } from './ServerContext.js';
import type { ServerContainerRef } from './types.js';
/**
 * Container component for server rendering.
 *
 * @param props.location Location object to base the initial URL for SSR.
 * @param props.children Child elements to render the content.
 * @param props.ref Ref object which contains helper methods.
 */
export declare const ServerContainer: React.ForwardRefExoticComponent<ServerContextType & {
    children: React.ReactNode;
} & React.RefAttributes<ServerContainerRef>>;
//# sourceMappingURL=ServerContainer.d.ts.map
import * as React from 'react';
import { type GestureResponderEvent, Text, type TextProps } from 'react-native';
import { type LinkProps } from './useLinkProps.js';
type PressEvent = React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent;
type Props<ParamList extends ReactNavigation.RootParamList> = LinkProps<ParamList> & Omit<TextProps, 'disabled'> & {
    target?: string;
    onPress?: (e: PressEvent) => void;
    disabled?: boolean | undefined;
    children: React.ReactNode;
};
/**
 * Component to render link to another screen using a path.
 * Uses an anchor tag on the web.
 *
 * @param props.screen Name of the screen to navigate to (e.g. `'Feeds'`).
 * @param props.params Params to pass to the screen to navigate to (e.g. `{ sort: 'hot' }`).
 * @param props.href Optional absolute path to use for the href (e.g. `/feeds/hot`).
 * @param props.action Optional action to override the in-page navigation. The `href` is still derived from `screen`, so this can be used to render a link while dispatching a different action (e.g. a `replace`).
 * @param props.children Child elements to render the content.
 */
export declare function Link<ParamList extends ReactNavigation.RootParamList>({ screen, params, action, href, style, target, ...rest }: Props<ParamList>): React.CElement<TextProps, Text>;
export {};
//# sourceMappingURL=Link.d.ts.map
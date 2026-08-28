"use strict";

/**
 * Flatten a type to remove all type alias names, unions etc.
 * This will show a plain object when hovering over the type.
 */

/**
 * keyof T doesn't work for union types. We can use distributive conditional types instead.
 * https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */

/**
 * We get a union type when using keyof, but we want an intersection instead.
 * https://stackoverflow.com/a/50375286/1665026
 */

/**
 * Infer the param list from the static navigation config.
 */

/**
 * Root navigator used in the app.
 * It's used for the global types in the app.
 *
 * Users need to use module augmentation to add their navigator type:
 *
 * ```ts
 * // Navigator created with static or dynamic API
 * const RootStack = createStackNavigator({
 *   // ...
 * });
 *
 * type RootStackType = typeof RootStack;
 *
 * declare module '@react-navigation/core' {
 *   interface RootNavigator extends RootStackType {}
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface

/**
 * Theme object for the navigation components.
 *
 * Custom properties can be added using declaration merging:
 *
 * ```ts
 * declare module '@react-navigation/core' {
 *   interface Theme extends NativeTheme {
 *     myCustomProperty: string;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface

export class PrivateValueStore {}
//# sourceMappingURL=types.js.map
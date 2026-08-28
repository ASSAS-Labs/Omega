"use strict";

import * as React from 'react';
import { isValidElementType } from 'react-is';
import { useRoute } from "./useRoute.js";

/**
 * Props for a screen component which is rendered by a static navigator.
 * Takes the route params as a generic argument.
 */
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Helper to create a typed `createXScreen` for static configuration.
 */
export function createScreenFactory() {
  return config => config;
}
const MemoizedScreen = /*#__PURE__*/React.memo(({
  component
}) => {
  const route = useRoute();
  const children = /*#__PURE__*/React.createElement(component, {
    route
  });
  return children;
});
MemoizedScreen.displayName = 'Memo(Screen)';
const getItemsFromScreens = (Screen, screens) => {
  return Object.entries(screens).map(([name, item]) => {
    let component;
    let props = {};
    let useIf;
    let isNavigator = false;
    if ('screen' in item) {
      const {
        screen,
        if: _if,
        ...rest
      } = item;
      useIf = _if;
      props = rest;
      if (isValidElementType(screen)) {
        component = screen;
      } else if ('config' in screen) {
        isNavigator = true;
        component = screen.getComponent();
      }
    } else if (isValidElementType(item)) {
      component = item;
    } else if ('config' in item) {
      isNavigator = true;
      component = item.getComponent();
    }
    if (component == null) {
      throw new Error(`Couldn't find a 'screen' property for the screen '${name}'. This can happen if you passed 'undefined'. You likely forgot to export your component from the file it's defined in, or mixed up default import and named import when importing.`);
    }
    const element = isNavigator ? (/*#__PURE__*/React.createElement(component, {})) : /*#__PURE__*/_jsx(MemoizedScreen, {
      component: component
    });
    return () => {
      const shouldRender = useIf == null || useIf();
      if (!shouldRender) {
        return null;
      }
      return /*#__PURE__*/_jsx(Screen, {
        name: name,
        ...props,
        children: () => element
      }, name);
    };
  });
};

/**
 * Create a component that renders a navigator based on the static configuration.
 *
 * @param tree Static navigation config.
 * @param displayName Name of the component to be displayed in React DevTools.
 * @returns A component which renders the navigator.
 */
export function createComponentForStaticNavigation(tree, displayName) {
  const {
    Navigator,
    Group,
    Screen,
    config
  } = tree;
  const {
    screens,
    groups,
    ...rest
  } = config;
  if (screens == null && groups == null) {
    throw new Error("Couldn't find a 'screens' or 'groups' property. Make sure to define your screens under a 'screens' property in the configuration.");
  }
  const items = [];

  // Loop through the config to find screens and groups
  // So we add the screens and groups in the same order as they are defined
  for (const key in config) {
    if (key === 'screens' && screens) {
      items.push(...getItemsFromScreens(Screen, screens));
    }
    if (key === 'groups' && groups) {
      items.push(...Object.entries(groups).map(([key, {
        if: useIf,
        ...group
      }]) => {
        const groupItems = getItemsFromScreens(Screen, group.screens);
        return () => {
          // Call unconditionally since screen configs may contain `useIf` hooks
          const children = groupItems.map(item => item());
          const shouldRender = useIf == null || useIf();
          if (!shouldRender) {
            return null;
          }
          return /*#__PURE__*/_jsx(Group, {
            navigationKey: key,
            ...group,
            children: children
          }, key);
        };
      }));
    }
  }
  if (items.length === 0) {
    throw new Error("Couldn't find any screens in the 'screens' or 'groups' property. Make sure to define at least one screen in the configuration.");
  }
  const NavigatorComponent = props => {
    const children = items.map(item => item());
    const screenOptions = typeof props.screenOptions === 'function' || typeof rest.screenOptions === 'function' ? options => ({
      ...(typeof rest.screenOptions === 'function' ? rest.screenOptions(options) : rest.screenOptions),
      ...(typeof props.screenOptions === 'function' ? props.screenOptions(options) : props.screenOptions)
    }) : {
      ...rest.screenOptions,
      ...props.screenOptions
    };
    const screenListeners = typeof props.screenListeners === 'function' || typeof rest.screenListeners === 'function' ? options => ({
      ...(typeof rest.screenListeners === 'function' ? rest.screenListeners(options) : rest.screenListeners),
      ...(typeof props.screenListeners === 'function' ? props.screenListeners(options) : props.screenListeners)
    }) : {
      ...rest.screenListeners,
      ...props.screenListeners
    };
    return /*#__PURE__*/_jsx(Navigator, {
      ...rest,
      ...props,
      screenOptions: screenOptions,
      screenListeners: screenListeners,
      children: children
    });
  };
  NavigatorComponent.displayName = displayName;
  return NavigatorComponent;
}

/**
 * Create a component that renders a navigator based on the static configuration.
 *
 * @deprecated Use `tree.getComponent()` instead.
 */
export function createComponentForStaticNavigationDeprecated(tree) {
  console.warn('`createComponentForStaticNavigation` is deprecated. Use `tree.getComponent()` instead.');
  return tree.getComponent();
}
/**
 * Create a path config object from a static navigation config for deep linking.
 *
 * @param tree Static navigation config.
 * @param options Additional options from `linking.config`.
 * @param auto Whether to automatically generate paths for leaf screens.
 * @returns Path config object to use in linking config.
 *
 * @example
 * ```js
 * const config = {
 *   screens: {
 *     Home: {
 *       screens: createPathConfigForStaticNavigation(HomeTabs),
 *     },
 *   },
 * };
 * ```
 */
export function createPathConfigForStaticNavigation(tree, options, auto) {
  let initialScreenHasPath = false;
  let initialScreenConfig;
  let hasEmptyPath = false;
  const createPathConfigForTree = (t, o, skipInitialDetection, allowAutoEmptyPath) => {
    const initialRouteName = o?.initialRouteName ?? t.config.initialRouteName;
    if (initialRouteName != null) {
      const routeNames = new Set(Object.keys(t.config.screens ?? {}));
      for (const group of Object.values(t.config.groups ?? {})) {
        Object.keys(group.screens).forEach(name => routeNames.add(name));
      }
      if (!routeNames.has(initialRouteName)) {
        throw new Error(`Couldn't find a screen named '${initialRouteName}' to use as 'initialRouteName'.`);
      }
    }
    const createPathConfigForScreens = (screens, initialRouteName) => {
      return Object.fromEntries(Object.entries(screens)
      // Re-order to move the initial route to the front
      // This way we can detect the initial route correctly
      .sort(([a], [b]) => {
        if (a === initialRouteName) {
          return -1;
        }
        if (b === initialRouteName) {
          return 1;
        }
        return 0;
      }).map(([key, item]) => {
        const screenConfig = {};
        const normalizePath = path => path.replace(/^\/+|\/+$/g, '');
        if ('linking' in item && item.linking !== undefined) {
          if (typeof item.linking === 'string') {
            screenConfig.path = item.linking;
          } else if (item.linking != null && typeof item.linking === 'object') {
            Object.assign(screenConfig, item.linking);
          }
        }
        if (screenConfig.exact && screenConfig.path == null) {
          throw new Error("A 'path' needs to be specified when specifying 'exact: true'. If you don't want this screen in the URL, specify it as empty string, e.g. `path: ''`.");
        }
        if (typeof screenConfig.path === 'string') {
          screenConfig.path = normalizePath(screenConfig.path);
        }
        if (screenConfig.alias != null) {
          screenConfig.alias = screenConfig.alias.map(alias => {
            if (typeof alias === 'string') {
              return normalizePath(alias);
            }
            return {
              ...alias,
              path: normalizePath(alias.path)
            };
          });
        }
        let screens;
        const hasExplicitScreens = 'screens' in screenConfig && screenConfig.screens != null;
        const hasDisabledLinking = 'linking' in item && item.linking === null;
        const childOptions = 'initialRouteName' in screenConfig && typeof screenConfig.initialRouteName === 'string' ? {
          initialRouteName: screenConfig.initialRouteName
        } : undefined;
        if (hasExplicitScreens && childOptions != null && !Object.keys(screenConfig.screens ?? {}).includes(childOptions.initialRouteName)) {
          throw new Error(`Couldn't find a screen named '${childOptions.initialRouteName}' to use as 'initialRouteName'.`);
        }
        const skipInitialDetectionInChild = skipInitialDetection || screenConfig.path != null && screenConfig.path !== '';
        const allowAutoEmptyPathInChild = allowAutoEmptyPath && (initialRouteName == null || key === initialRouteName);
        if (!hasExplicitScreens && !hasDisabledLinking && 'config' in item) {
          screens = createPathConfigForTree(item, childOptions, skipInitialDetectionInChild, allowAutoEmptyPathInChild);
        } else if (!hasExplicitScreens && !hasDisabledLinking && 'screen' in item && 'config' in item.screen && (item.screen.config.screens || item.screen.config.groups)) {
          screens = createPathConfigForTree(item.screen, childOptions, skipInitialDetectionInChild, allowAutoEmptyPathInChild);
        }
        if (screens) {
          screenConfig.screens = screens;
        }
        if (auto && !('screens' in screenConfig && screenConfig.screens) &&
        // Skip generating path for screens that specify linking config as `null` explicitly
        !hasDisabledLinking) {
          if (screenConfig.path != null) {
            if (!skipInitialDetection) {
              if (screenConfig.path === '') {
                // We encounter a leaf screen with empty path,
                // Clear the initial screen config as it's not needed anymore
                initialScreenConfig = undefined;
                hasEmptyPath = true;
                if (allowAutoEmptyPath && key === initialRouteName) {
                  initialScreenHasPath = true;
                }
              } else if (allowAutoEmptyPath && key === initialRouteName &&
              // Keep an already discovered fallback unless the initial route
              // explicitly uses an empty path.
              initialScreenConfig == null) {
                initialScreenHasPath = true;
              }
            }
          } else {
            if (!skipInitialDetection && allowAutoEmptyPath && (initialRouteName == null || key === initialRouteName) && !hasEmptyPath && initialScreenConfig == null) {
              initialScreenConfig = screenConfig;
            }
            screenConfig.path = normalizePath(key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase());
          }
        }
        return [key, screenConfig];
      }).filter(([, screen]) => Object.keys(screen).length > 0));
    };
    const screens = {};

    // Loop through the config to find screens and groups
    // So we add the screens and groups in the same order as they are defined
    for (const key in t.config) {
      if (key === 'screens' && t.config.screens) {
        Object.assign(screens, createPathConfigForScreens(t.config.screens, o?.initialRouteName ?? t.config.initialRouteName));
      }
      if (key === 'groups' && t.config.groups) {
        Object.entries(t.config.groups).forEach(([, group]) => {
          Object.assign(screens, createPathConfigForScreens(group.screens, o?.initialRouteName ?? t.config.initialRouteName));
        });
      }
    }
    if (Object.keys(screens).length === 0) {
      return undefined;
    }
    return screens;
  };
  const screens = createPathConfigForTree(tree, options, false, true);
  if (auto && initialScreenConfig && !initialScreenHasPath) {
    initialScreenConfig.path = '';
  }
  return screens;
}
//# sourceMappingURL=StaticNavigation.js.map
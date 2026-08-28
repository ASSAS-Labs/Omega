"use strict";

import { CommonActions, createNavigatorFactory, createScreenFactory, useNavigationBuilder } from '@react-navigation/core';
import * as React from 'react';
import { useBuildHref } from "./useLinkBuilder.js";
import { useMemoArray } from "./useMemoArray.js";
import { jsx as _jsx } from "react/jsx-runtime";
export function createStandardNavigationFactories(navigator, router, mapper) {
  const {
    type,
    version,
    NavigatorContent
  } = navigator;
  if (type !== 'standard') {
    throw new Error(`createStandardNavigationFactories only works with standard navigator objects, but got navigator of ${typeof type === 'string' ? `type "${type}".` : 'unknown type.'}`);
  }
  if (version !== 1) {
    throw new Error(`createStandardNavigationFactories only works with version 1 of standard navigator objects, but got version ${version}.`);
  }
  function StandardNavigationNavigator(props) {
    const builder = useNavigationBuilder(router, props);
    const buildHref = useBuildHref();
    const routes = useMemoArray(('preloadedRoutes' in builder.state && Array.isArray(builder.state.preloadedRoutes) ? builder.state.routes.concat(builder.state.preloadedRoutes) : builder.state.routes).map(route => {
      const href = buildHref(route.name, route.params);
      return [{
        key: route.key,
        name: route.name,
        params: route.params,
        href
      }, [route.key, route.name, route.params, href]];
    }));
    const state = React.useMemo(() => ({
      index: builder.state.index,
      routes
    }), [builder.state.index, routes]);
    const descriptors = {};
    for (const route of state.routes) {
      const descriptor = builder.descriptors[route.key] ?? builder.describe(route, true);
      descriptors[route.key] = {
        options: descriptor.options,
        render: descriptor.render
      };
    }
    const actions = React.useMemo(() => ({
      navigate(name, params) {
        builder.navigation.dispatch({
          ...CommonActions.navigate(name, params),
          target: builder.state.key
        });
      },
      back() {
        builder.navigation.goBack();
      }
    }), [builder.navigation, builder.state.key]);
    const emitter = React.useMemo(() => ({
      // @ts-expect-error - they are compatible
      emit: builder.navigation.emit
    }), [builder.navigation]);
    const mapped = mapper?.({
      state: builder.state,
      navigation: builder.navigation
    });

    // Omit props used by useNavigationBuilder and routers internally
    const {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      children,
      id,
      initialRouteName,
      layout,
      screenLayout,
      screenListeners,
      screenOptions,
      UNSTABLE_routeNamesChangeBehavior,
      UNSTABLE_router,
      /* eslint-enable @typescript-eslint/no-unused-vars */
      ...rest
    } = props;
    return /*#__PURE__*/_jsx(builder.NavigationContent, {
      children: /*#__PURE__*/_jsx(NavigatorContent, {
        ...rest,
        ...mapped,
        state: state,
        descriptors: descriptors,
        actions: actions,
        emitter: emitter
      })
    });
  }
  const createNavigator = createNavigatorFactory(StandardNavigationNavigator);
  const createScreen = createScreenFactory();
  return {
    createNavigator,
    createScreen
  };
}
//# sourceMappingURL=createStandardNavigationFactories.js.map
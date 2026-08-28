"use strict";

/* eslint-disable no-restricted-imports */
import * as ReactNative from 'react-native';
let InteractionManager;
try {
  InteractionManager = ReactNative.InteractionManager;
} catch (e) {
  // On newer React Native versions, accessing InteractionManager throws an error
  // https://github.com/react/react-native/pull/57026
}
export { InteractionManager };
//# sourceMappingURL=InteractionManager.js.map
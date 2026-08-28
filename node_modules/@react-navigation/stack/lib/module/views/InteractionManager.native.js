"use strict";

import { Platform } from 'react-native';
let InteractionManager;
const version = Platform.constants?.reactNativeVersion;
try {
  InteractionManager = version?.major === 0 && version.minor >= 82 ? undefined : require('react-native').InteractionManager;
} catch (e) {
  // On newer React Native versions, accessing InteractionManager throws an error
  // https://github.com/react/react-native/pull/57026
}
export { InteractionManager };
//# sourceMappingURL=InteractionManager.native.js.map
"use strict";

import * as React from 'react';
import { BackHandler } from 'react-native';
export function useBackButton(ref) {
  React.useEffect(() => {
    // eslint-disable-next-line @eslint-react/web-api/no-leaked-event-listener
    const subscription = BackHandler.addEventListener('hardwareBackPress',
    // eslint-disable-next-line @eslint-react/web-api/no-leaked-event-listener
    () => {
      const navigation = ref.current;
      if (navigation == null) {
        return false;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [ref]);
}
//# sourceMappingURL=useBackButton.native.js.map
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Real-time phone-clock synchronization.
 *
 * Calls the given callback whenever the app becomes active again (resumed from
 * background, opened the next morning, returning from another app) so screens
 * can re-evaluate `new Date()` immediately and shift days/logs in real time.
 * A ref keeps the latest callback without re-subscribing on every render.
 */
export function useTimeSync(onActive: () => void) {
  const callbackRef = useRef(onActive);
  useEffect(() => {
    callbackRef.current = onActive;
  }, [onActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          callbackRef.current();
        }
      }
    );
    return () => subscription.remove();
  }, []);
}

import { useSyncExternalStore } from 'react';
import {
  getWeightUnitSync,
  subscribeWeightUnit,
  WeightUnit,
} from '../services/weightUnitPrefs';

/**
 * Reactively returns the active weight unit ('kg' | 'lbs'). Components using
 * this hook re-render instantly when the unit changes (e.g. from Settings).
 */
export function useWeightUnit(): WeightUnit {
  return useSyncExternalStore(subscribeWeightUnit, getWeightUnitSync);
}

'use strict';

import { logger } from "../debug/logger.js";
const handleCache = new WeakMap();
export function bundleValueUnpacker(objectToUnpack) {
  const workletHash = objectToUnpack.__workletHash;
  if (workletHash !== undefined) {
    return getWorklet(workletHash, objectToUnpack.__closure);
  } else if (objectToUnpack.__init !== undefined) {
    let value = handleCache.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init();
      handleCache.set(objectToUnpack, value);
    }
    return value;
  } else {
    throw new Error(`[Worklets] Data type not recognized by value unpacker: "${globalThis._toString(objectToUnpack)}".`);
  }
}
function getWorklet(workletHash, closureVariables) {
  let worklet;
  if (__DEV__) {
    try {
      worklet = getWorkletFromMetroRequire(workletHash, closureVariables);
    } catch (e) {
      logger.error(`Unable to resolve worklet with hash ${workletHash}. Try reloading the app. Original error: ${e.message}`);
    }
  } else {
    worklet = getWorkletFromMetroRequire(workletHash, closureVariables);
  }
  return worklet;
}
const metroRequire = globalThis.__r;
function getWorkletFromMetroRequire(workletHash, closureVariables) {
  const factory = metroRequire(workletHash).default;
  return factory(closureVariables);
}
//# sourceMappingURL=bundleUnpacker.native.js.map
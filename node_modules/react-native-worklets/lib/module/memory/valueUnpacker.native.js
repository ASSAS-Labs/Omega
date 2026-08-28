'use strict';

export function installValueUnpacker() {
  'worklet';
  'no-worklet-closure';

  const workletsCache = new Map();
  const handleCache = new WeakMap();
  function valueUnpacker(objectToUnpack) {
    const workletHash = objectToUnpack.__workletHash;
    if (workletHash !== undefined) {
      let workletFun = workletsCache.get(workletHash);
      if (workletFun === undefined) {
        const initData = objectToUnpack.__initData;
        if (initData.bytecode !== undefined) {
          workletFun = globalThis.evalBytecode(initData.bytecode);
        } else if (globalThis.evalWithSourceMap && initData.sourceMap) {
          // if the runtime (hermes only for now) supports loading source maps
          // we want to use the proper filename for the location as it guarantees
          // that debugger understands and loads the source code of the file where
          // the worklet is defined.
          workletFun = globalThis.evalWithSourceMap(initData.code, initData.location, initData.sourceMap);
        } else if (globalThis.evalWithSourceUrl) {
          // if the runtime doesn't support loading source maps, in dev mode we
          // can pass source url when evaluating the worklet. Now, instead of using
          // the actual file location we use worklet hash, as it the allows us to
          // properly symbolicate traces (see errors.ts for details)
          workletFun = globalThis.evalWithSourceUrl(initData.code, `worklet_${workletHash}`);
        } else {
          // in release we use the regular eval to save on JSI calls
          // eslint-disable-next-line no-eval
          workletFun = eval(initData.code);
        }
        workletsCache.set(workletHash, workletFun);
      }
      const functionInstance = workletFun.bind(objectToUnpack);
      objectToUnpack._recur = functionInstance;
      return functionInstance;
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
  globalThis.__valueUnpacker = valueUnpacker;
}
//# sourceMappingURL=valueUnpacker.native.js.map
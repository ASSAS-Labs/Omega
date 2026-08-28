'use strict';

export function installCustomSerializableUnpacker() {
  'worklet';
  'no-worklet-closure';

  if (!globalThis.__customSerializationRegistry) {
    globalThis.__customSerializationRegistry = [];
  }
  const registry = globalThis.__customSerializationRegistry;
  function customSerializableUnpacker(value, typeId) {
    const data = registry[typeId];
    if (!data) {
      throw new Error(`[Worklets] No custom serializable registered for type ID ${typeId}.`);
    }
    return data.unpack(value);
  }
  globalThis.__customSerializableUnpacker = customSerializableUnpacker;
}
//# sourceMappingURL=customSerializableUnpacker.native.js.map
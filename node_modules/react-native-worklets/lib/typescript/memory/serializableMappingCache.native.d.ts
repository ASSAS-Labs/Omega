import type { SerializableRef } from './types';
/**
 * This symbol is used to represent a mapping from the value to itself.
 *
 * It's used to prevent converting a serializable that's already converted - for
 * example a Shared Value that's in worklet's closure.
 */
export declare const serializableMappingFlag: unique symbol;
export declare const serializableMappingCache: {
    set(serializable: object, serializableRef?: SerializableRef | WeakRef<SerializableRef>): void;
    get: (key: object) => symbol | SerializableRef | WeakRef<SerializableRef> | undefined;
};
//# sourceMappingURL=serializableMappingCache.native.d.ts.map
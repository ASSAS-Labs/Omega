import { isSerializableRef, makeShareable, makeShareableCloneOnUIRecursive } from './memory/serializable';
import type { SerializableRef } from './memory/types';
/** @deprecated Use {@link SerializableRef} instead. */
export type ShareableRef<T> = SerializableRef<T>;
export { makeShareable, makeShareableCloneOnUIRecursive };
/** @deprecated It will be removed in the next major version. */
export type MakeShareableClone = <T>(value: T, shouldPersistRemote?: boolean, depth?: number) => ShareableRef<T>;
/** @deprecated Use {@link createSerializable} instead. */
export declare const makeShareableCloneRecursive: MakeShareableClone;
/** @deprecated Use {@link isSerializableRef} instead. */
export declare const isShareableRef: typeof isSerializableRef;
/** @deprecated Use {@link serializableMappingCache} instead. */
export declare const shareableMappingCache: {
    set(serializable: object, serializableRef?: SerializableRef | WeakRef<SerializableRef>): void;
    get: (key: object) => symbol | SerializableRef | WeakRef<SerializableRef> | undefined;
};
/** @deprecated NOOP, don't use. */
export declare function callMicrotasks(): void;
//# sourceMappingURL=deprecated.d.ts.map
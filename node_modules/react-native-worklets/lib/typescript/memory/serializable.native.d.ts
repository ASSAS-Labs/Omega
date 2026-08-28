import type { FlatSerializableRef, RegistrationData, SerializableRef } from './types';
export declare function isSerializableRef<TValue = unknown>(value: unknown): value is SerializableRef<TValue>;
export declare function createSerializable<TValue>(value: TValue, shouldPersistRemote?: boolean, depth?: number): SerializableRef<TValue>;
export declare namespace createSerializable {
    var __bundleData: {
        imported: string;
        source: number;
    };
}
/**
 * `registerCustomSerializable` lets you register your own pre-serialization and
 * post-deserialization logic. This is necessary for objects with prototypes
 * different than just `Object.prototype` or some other built-in prototypes like
 * `Map` etc. Worklets can't handle such objects by default to convert into
 * [Serializables](https://docs.swmansion.com/react-native-worklets/docs/memory/serializable)
 * hence you need to register them as **Custom Serializables**. This way you can
 * tell Worklets how to transfer your custom data structures between different
 * Runtimes without manually serializing and deserializing them every time.
 *
 * @param registrationData - The registration data for the custom serializable -
 *   {@link RegistrationData}
 * @see https://docs.swmansion.com/react-native-worklets/docs/memory/registerCustomSerializable/
 */
export declare function registerCustomSerializable<TValue extends object, TPacked extends object>(registrationData: RegistrationData<TValue, TPacked>): void;
declare function makeShareableCloneOnUIRecursiveLEGACY<TValue>(value: TValue): FlatSerializableRef<TValue>;
/** @deprecated This function is no longer supported. */
export declare const makeShareableCloneOnUIRecursive: typeof makeShareableCloneOnUIRecursiveLEGACY;
/**
 * This function creates a value on UI with persistent state - changes to it on
 * the UI thread will be seen by all worklets. Use it when you want to create a
 * value that is read and written only on the UI thread.
 *
 * @deprecated This function is no longer supported.
 */
export declare function makeShareable<TValue extends object>(value: TValue): TValue;
export {};
//# sourceMappingURL=serializable.native.d.ts.map
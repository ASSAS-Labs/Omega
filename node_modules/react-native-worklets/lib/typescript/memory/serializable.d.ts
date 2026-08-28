import type { FlatSerializableRef, RegistrationData, SerializableRef } from './types';
export declare function isSerializableRef<TValue = unknown>(value: unknown): value is SerializableRef<TValue>;
export declare function createSerializable<TValue>(value: TValue): SerializableRef<TValue>;
export declare function makeShareableCloneOnUIRecursive<TValue>(value: TValue): FlatSerializableRef<TValue>;
export declare function makeShareable<TValue>(value: TValue): TValue;
export declare function registerCustomSerializable<TValue extends object, TPacked extends object>(_registrationData: RegistrationData<TValue, TPacked>): void;
//# sourceMappingURL=serializable.d.ts.map
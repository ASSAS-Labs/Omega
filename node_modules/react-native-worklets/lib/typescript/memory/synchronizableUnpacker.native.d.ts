import { type Synchronizable, type SynchronizableRef } from './types';
export declare function installSynchronizableUnpacker(): void;
export type SynchronizableUnpacker = <TValue>(synchronizableRef: SynchronizableRef<TValue>) => Synchronizable<TValue>;
//# sourceMappingURL=synchronizableUnpacker.native.d.ts.map
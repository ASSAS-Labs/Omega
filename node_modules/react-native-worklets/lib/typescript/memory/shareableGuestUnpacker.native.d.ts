import type { SerializableRef, Shareable, ShareableGuestDecorator } from './types';
export declare function installShareableGuestUnpacker(): void;
export type ShareableGuestUnpacker<TValue = unknown> = (hostId: number, shareableRef: SerializableRef<TValue>, decorateGuest?: ShareableGuestDecorator<TValue>) => Shareable<TValue>;
//# sourceMappingURL=shareableGuestUnpacker.native.d.ts.map
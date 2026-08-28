import type { Shareable, ShareableHostDecorator } from './types';
export declare function installShareableHostUnpacker(): void;
export type ShareableHostUnpacker<TValue = unknown> = (initial: TValue, decorateHost?: ShareableHostDecorator<TValue>) => Shareable<TValue>;
//# sourceMappingURL=shareableHostUnpacker.native.d.ts.map
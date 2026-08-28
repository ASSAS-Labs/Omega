import type { DynamicFlagName, DynamicFlagsType, StaticFeatureFlagsSchema } from './types';
export declare const DynamicFlags: DynamicFlagsType;
export declare function setDynamicFeatureFlag(name: DynamicFlagName, value: boolean): void;
export declare function getDynamicFeatureFlag(name: DynamicFlagName): boolean;
export declare function getStaticFeatureFlag(name: keyof StaticFeatureFlagsSchema): boolean;
//# sourceMappingURL=featureFlags.native.d.ts.map
import type { DynamicFlagName, StaticFeatureFlagsSchema } from './types';
export declare function getStaticFeatureFlag(_name: keyof StaticFeatureFlagsSchema): boolean;
export declare function setDynamicFeatureFlag(_name: DynamicFlagName, _value: boolean): void;
export declare function getDynamicFeatureFlag(_name: DynamicFlagName): boolean;
//# sourceMappingURL=featureFlags.d.ts.map
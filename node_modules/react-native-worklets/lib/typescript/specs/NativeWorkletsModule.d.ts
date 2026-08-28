import { type TurboModule } from 'react-native';
export interface Spec extends TurboModule {
    installTurboModule: (bundleModeEnabled: boolean) => boolean;
    toggleSlowAnimationsOnUIRuntime: () => boolean;
    start: () => boolean;
}
declare const _default: Spec | null | undefined;
export default _default;
//# sourceMappingURL=NativeWorkletsModule.d.ts.map
/**
 * Babel configuration for the Expo app (native builds, Metro and Jest all read
 * this file).
 *
 * NOTE ON REANIMATED: `babel-preset-expo` injects the worklet transform itself
 * — it appends `react-native-worklets/plugin` while `react-native-worklets` is
 * installed (which it is, next to `react-native-reanimated@4`) and only falls
 * back to `react-native-reanimated/plugin` on Reanimated 3. The plugin must run
 * last in the pipeline and must not be listed here as well: adding it manually
 * would run the transform twice, and would register the v3 plugin that no
 * longer matches the Reanimated 4 runtime. Keeping the preset as the single
 * entry is therefore the correct wiring for this stack — verified by inspecting
 * the transformed output of `src/components/PressFeedback.tsx`, which carries
 * the `__workletHash` / `__initData` markers the plugin emits (without it,
 * `useAnimatedStyle` would have nothing to run on the UI thread).
 */
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
  };
};

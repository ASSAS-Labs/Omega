/**
 * Manual Jest mock for `@shopify/flash-list`.
 *
 * FlashList v2 renders through a native recycler host component plus layout
 * measurements that never settle in `react-test-renderer`, so the component is
 * swapped for React Native's own `FlatList`. That keeps the suites asserting
 * the real item pipeline (data → `renderItem` → `keyExtractor` → header/footer/
 * empty slots) without pulling native measurement into the test environment.
 *
 * Jest picks this file up automatically for every suite that imports
 * `@shopify/flash-list`, because `__mocks__` sits next to `node_modules`.
 */
const { FlatList } = require('react-native');

module.exports = {
  FlashList: FlatList,
};

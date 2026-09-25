/**
 * Jest manual mock for `expo-sharing`.
 *
 * Records the last shared uri so tests can inspect what was exported, and can
 * be flipped to "sharing unavailable" to exercise the failure path.
 */
const state: { available: boolean; sharedUris: string[] } = {
  available: true,
  sharedUris: [],
};

export const isAvailableAsync = jest.fn(async () => state.available);

export const shareAsync = jest.fn(async (uri: string) => {
  state.sharedUris.push(uri);
});

/** Test helper: resets availability and the recorded share calls. */
export function __resetSharing(): void {
  state.available = true;
  state.sharedUris.length = 0;
  isAvailableAsync.mockClear();
  shareAsync.mockClear();
}

/** Test helper: marks the native share sheet as unavailable. */
export function __setSharingAvailable(available: boolean): void {
  state.available = available;
}

/** Test helper: uris passed to the native share sheet. */
export function __getSharedUris(): string[] {
  return [...state.sharedUris];
}

export default { isAvailableAsync, shareAsync };

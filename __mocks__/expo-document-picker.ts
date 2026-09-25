/**
 * Jest manual mock for `expo-document-picker`.
 *
 * Tests queue the result the picker should return (or a cancellation) via
 * `__setNextPickerResult`.
 */
type PickerResult =
  | { canceled: true; assets: null }
  | { canceled: false; assets: { uri: string; name: string; mimeType: string }[] };

let nextResult: PickerResult = { canceled: true, assets: null };

export const getDocumentAsync = jest.fn(async () => nextResult);

/** Test helper: queue the result of the next picker invocation. */
export function __setNextPickerResult(uri: string | null): void {
  nextResult = uri
    ? {
        canceled: false,
        assets: [{ uri, name: 'backup.json', mimeType: 'application/json' }],
      }
    : { canceled: true, assets: null };
}

/** Test helper: restores the default (cancelled) picker result. */
export function __resetDocumentPicker(): void {
  nextResult = { canceled: true, assets: null };
  getDocumentAsync.mockClear();
}

export default { getDocumentAsync };

/**
 * Jest manual mock for `expo-file-system` (SDK 54 File/Directory API).
 *
 * Backed by an in-memory map so backup export/import round-trips can be
 * exercised without touching the device filesystem.
 */
const virtualFiles = new Map<string, string>();

function toUri(part: unknown): string {
  if (typeof part === 'string') return part;
  if (part && typeof part === 'object' && 'uri' in (part as Record<string, unknown>)) {
    return String((part as { uri: unknown }).uri);
  }
  throw new Error(`Unsupported path segment: ${String(part)}`);
}

export class File {
  uri: string;

  constructor(...parts: unknown[]) {
    this.uri = parts.map(toUri).join('/');
  }

  get exists(): boolean {
    return virtualFiles.has(this.uri);
  }

  write(content: string): void {
    virtualFiles.set(this.uri, String(content));
  }

  /** Synchronous read, matching expo-file-system v19. */
  text(): string {
    return virtualFiles.get(this.uri) ?? '';
  }

  async textAsync(): Promise<string> {
    return this.text();
  }

  delete(): void {
    virtualFiles.delete(this.uri);
  }
}

export class Directory {
  uri: string;

  constructor(...parts: unknown[]) {
    this.uri = parts.map(toUri).join('/');
  }

  get exists(): boolean {
    return true;
  }
}

export const Paths = {
  cache: { uri: 'file:///cache' },
  document: { uri: 'file:///document' },
  join: (...parts: unknown[]) => parts.map(toUri).join('/'),
};

/** Test helper: empties the virtual filesystem. */
export function __resetFileSystem(): void {
  virtualFiles.clear();
}

export default { File, Directory, Paths };

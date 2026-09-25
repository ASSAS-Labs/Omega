/**
 * Minimal ambient typings for `react-test-renderer`.
 *
 * The installed 19.x build no longer ships declarations of its own and the
 * published `@types/react-test-renderer` package only covers the React 18 line,
 * so the small surface used by the UI test suites is declared here.
 *
 * This file must stay a script (no top-level imports/exports) for the module
 * declaration to be ambient.
 */
declare module 'react-test-renderer' {
  export interface ReactTestInstance {
    readonly type: unknown;
    readonly props: Record<string, any>;
    readonly parent: ReactTestInstance | null;
    readonly children: Array<ReactTestInstance | string>;
    findAllByType(type: unknown): ReactTestInstance[];
    findByProps(props: Record<string, unknown>): ReactTestInstance;
    findAllByProps(props: Record<string, unknown>): ReactTestInstance[];
    findAll(predicate: (instance: ReactTestInstance) => boolean): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    readonly root: ReactTestInstance;
    toJSON(): unknown;
    unmount(): void;
    update(element: unknown): void;
  }

  export function create(element: unknown): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): Promise<void>;
}

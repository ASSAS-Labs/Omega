declare global {
    var evalWithSourceMap: ((js: string, sourceURL: string, sourceMap: string) => () => unknown) | undefined;
    var evalWithSourceUrl: ((js: string, sourceURL: string) => () => unknown) | undefined;
    var evalBytecode: ((bytecode: ArrayBuffer) => () => unknown) | undefined;
}
export declare function installValueUnpacker(): void;
//# sourceMappingURL=valueUnpacker.native.d.ts.map
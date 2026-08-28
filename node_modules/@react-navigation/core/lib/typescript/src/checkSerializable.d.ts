type Success = {
    serializable: true;
};
type Failure = {
    serializable: false;
    location: (string | number)[];
    reason: string;
};
type Result = Success | Failure;
export declare function checkSerializable(o: {
    [key: string]: any;
}): Result;
export {};
//# sourceMappingURL=checkSerializable.d.ts.map
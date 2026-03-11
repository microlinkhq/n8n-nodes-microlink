export declare const OBJECT_PARAMS: Set<string>;
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
export declare function flattenObject(prefix: string, obj: Record<string, unknown>, target: Record<string, unknown>): void;
export declare function parseLooseValue(value: unknown): unknown;
export declare class Microlink {
    description: Record<string, unknown>;
    constructor();
    execute(this: any): Promise<any[][]>;
}

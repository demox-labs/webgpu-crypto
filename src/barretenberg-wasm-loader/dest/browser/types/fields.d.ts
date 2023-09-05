import { BufferReader } from '../serialize/index.js';
export declare class Fr {
    readonly value: bigint;
    static ZERO: Fr;
    static MODULUS: bigint;
    static MAX_VALUE: bigint;
    static SIZE_IN_BYTES: number;
    constructor(value: bigint);
    static random(): Fr;
    static fromBuffer(buffer: Uint8Array | BufferReader): Fr;
    static fromBufferReduce(buffer: Uint8Array | BufferReader): Fr;
    static fromString(str: string): Fr;
    toBuffer(): Uint8Array;
    toString(): string;
    equals(rhs: Fr): boolean;
    isZero(): boolean;
}
export declare class Fq {
    readonly value: bigint;
    static MODULUS: bigint;
    static MAX_VALUE: bigint;
    static SIZE_IN_BYTES: number;
    constructor(value: bigint);
    static random(): Fq;
    static fromBuffer(buffer: Uint8Array | BufferReader): Fq;
    static fromBufferReduce(buffer: Uint8Array | BufferReader): Fq;
    static fromString(str: string): Fq;
    toBuffer(): Uint8Array;
    toString(): string;
    equals(rhs: Fq): boolean;
    isZero(): boolean;
}
//# sourceMappingURL=fields.d.ts.map
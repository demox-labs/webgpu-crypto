import { Fq } from '../index.js';
import { BufferReader } from '../../serialize/buffer_reader.js';
export declare class Point {
    readonly x: Fq;
    readonly y: Fq;
    static SIZE_IN_BYTES: number;
    static EMPTY: Point;
    constructor(x: Fq, y: Fq);
    static random(): Point;
    static fromBuffer(buffer: Uint8Array | BufferReader): Point;
    static fromString(address: string): Point;
    toBuffer(): Uint8Array;
    toString(): string;
    equals(rhs: Point): boolean;
}
//# sourceMappingURL=point.d.ts.map
import { BarretenbergWasm, BarretenbergWasmWorker } from '../barretenberg_wasm/barretenberg_wasm.js';
import { Bufferable, OutputType } from '../serialize/index.js';
/**
 * Calls a WASM export function, handles allocating/freeing of memory, and serializing/deserializing to types.
 *
 * Notes on function binding ABI:
 * All functions can have an arbitrary number of input and output args.
 * All arguments must be pointers.
 * Input args are determined by being const or pointer to const.
 * Output args must come after input args.
 * All input data is big-endian.
 * All output data is big-endian, except output heap alloc pointers.
 * As integer types are converted to/from big-endian form, we shouldn't have to worry about memory alignment. (SURE?)
 * All functions should return void.
 * This binding function is responsible for allocating argument memory (including output memory).
 * Variable length output args are allocated on the heap, and the resulting pointer is written to the output arg ptr,
 * hence the above statement remains true.
 * Binding will free any variable length output args that were allocated on the heap.
 */
export declare class BarretenbergBinder {
    wasm: BarretenbergWasm | BarretenbergWasmWorker;
    constructor(wasm: BarretenbergWasm | BarretenbergWasmWorker);
    callWasmExport(funcName: string, inArgs: Bufferable[], outTypes: OutputType[]): Promise<any[]>;
    private deserializeOutputArgs;
}
export declare class BarretenbergBinderSync {
    wasm: BarretenbergWasm;
    constructor(wasm: BarretenbergWasm);
    callWasmExport(funcName: string, inArgs: Bufferable[], outTypes: OutputType[]): any[];
    private deserializeOutputArgs;
}
//# sourceMappingURL=index.d.ts.map
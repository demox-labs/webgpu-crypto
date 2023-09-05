import { BarretenbergApi, BarretenbergApiSync } from '../barretenberg_api/index.js';
import { BarretenbergWasmWorker } from '../barretenberg_wasm/index.js';
/**
 * Returns a single threaded, synchronous, barretenberg api.
 * Can be used on the main thread to perform small light-weight requests like hashing etc.
 */
export declare function newBarretenbergApiSync(): Promise<BarretenbergApiSync>;
export declare class BarretenbergApiAsync extends BarretenbergApi {
    private worker;
    private wasm;
    constructor(worker: any, wasm: BarretenbergWasmWorker);
    getNumThreads(): Promise<number>;
    destroy(): Promise<void>;
}
/**
 * Returns a multi threaded, asynchronous, barretenberg api.
 * It runs in a worker, and so can be used within the browser to execute long running, multi-threaded requests
 * like proof construction etc.
 */
export declare function newBarretenbergApiAsync(threads?: number): Promise<BarretenbergApiAsync>;
//# sourceMappingURL=index.d.ts.map
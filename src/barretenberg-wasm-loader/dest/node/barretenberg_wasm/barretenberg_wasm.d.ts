/// <reference types="node" resolution-mode="require"/>
import { type Worker } from 'worker_threads';
import { Remote } from 'comlink';
export declare class BarretenbergWasm {
    static MAX_THREADS: number;
    private memStore;
    private memory;
    private instance;
    private workers;
    private remoteWasms;
    private nextWorker;
    private nextThreadId;
    private isThread;
    private logger;
    static new(): Promise<BarretenbergWasm>;
    /**
     * Construct and initialise BarretenbergWasm within a Worker. Return both the worker and the wasm proxy.
     * Used when running in the browser, because we can't block the main thread.
     */
    static newWorker(threads?: number): Promise<{
        worker: Worker;
        wasm: BarretenbergWasmWorker;
    }>;
    getNumThreads(): number;
    /**
     * Init as main thread. Spawn child threads.
     */
    init(threads?: number, logger?: (msg: string) => void, initial?: number, maximum?: number): Promise<void>;
    /**
     * Init as worker thread.
     */
    initThread(module: WebAssembly.Module, memory: WebAssembly.Memory): Promise<void>;
    /**
     * Called on main thread. Signals child threads to gracefully exit.
     */
    destroy(): Promise<void>;
    private getImportObj;
    exports(): any;
    /**
     * When returning values from the WASM, use >>> operator to convert signed representation to unsigned representation.
     */
    call(name: string, ...args: any): number;
    memSize(): number;
    getMemorySlice(start: number, end?: number): Uint8Array;
    writeMemory(offset: number, arr: Uint8Array): void;
    private getMemory;
    private stringFromAddress;
}
export type BarretenbergWasmWorker = Remote<BarretenbergWasm>;
//# sourceMappingURL=barretenberg_wasm.d.ts.map
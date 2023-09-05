import { BarretenbergWasmWorker } from '../barretenberg_wasm.js';
export declare function fetchCode(multithreading: boolean): Promise<ArrayBuffer>;
export declare function createWorker(): Worker;
export declare function getRemoteBarretenbergWasm(worker: Worker): BarretenbergWasmWorker;
export declare function getNumCpu(): number;
export declare function threadLogger(): ((msg: string) => void) | undefined;
export declare function killSelf(): void;
//# sourceMappingURL=index.d.ts.map
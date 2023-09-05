/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { Worker } from 'worker_threads';
import { type BarretenbergWasmWorker } from '../barretenberg_wasm.js';
export declare function fetchCode(multithreading: boolean): Promise<Buffer>;
export declare function createWorker(): Worker;
export declare function getRemoteBarretenbergWasm(worker: Worker): BarretenbergWasmWorker;
export declare function getNumCpu(): number;
/**
 * In node, the message passing is different to the browser. When using 'debug' in the browser, we seemingly always
 * get our logs, but in node it looks like it's dependent on the chain of workers from child to main thread be
 * unblocked. If one of our threads aborts, we can't see it as the parent is blocked waiting on threads to join.
 * To work around this in node, threads will by default write directly to stdout.
 */
export declare function threadLogger(): ((msg: string) => void) | undefined;
export declare function killSelf(): never;
//# sourceMappingURL=index.d.ts.map
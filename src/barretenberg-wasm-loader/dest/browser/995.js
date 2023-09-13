/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 640:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BarretenbergWasm = void 0;
const tslib_1 = __webpack_require__(582);
const events_1 = __webpack_require__(187);
const debug_1 = tslib_1.__importDefault(__webpack_require__(227));
const comlink_1 = __webpack_require__(375);
const index_js_1 = __webpack_require__(324);
const barretenberg_wasm_1 = __webpack_require__(581);
const debug = (0, debug_1.default)('bb.js:wasm');
events_1.EventEmitter.defaultMaxListeners = 30;
class BarretenbergWasm {
    constructor() {
        this.memStore = {};
        this.workers = [];
        this.remoteWasms = [];
        this.nextWorker = 0;
        this.nextThreadId = 1;
        this.isThread = false;
        this.logger = debug;
    }
    static async new() {
        const barretenberg = new BarretenbergWasm();
        await barretenberg.init(1);
        return barretenberg;
    }
    /**
     * Construct and initialise BarretenbergWasm within a Worker. Return both the worker and the wasm proxy.
     * Used when running in the browser, because we can't block the main thread.
     */
    static async newWorker(threads) {
        const worker = (0, barretenberg_wasm_1.createWorker)();
        const wasm = (0, barretenberg_wasm_1.getRemoteBarretenbergWasm)(worker);
        await wasm.init(threads, (0, comlink_1.proxy)(debug));
        return { worker, wasm };
    }
    getNumThreads() {
        return this.workers.length + 1;
    }
    /**
     * Init as main thread. Spawn child threads.
     */
    async init(threads = 1, logger = debug, initial = 25, maximum = 2 ** 16) {
        this.logger = logger;
        const initialMb = (initial * 2 ** 16) / (1024 * 1024);
        const maxMb = (maximum * 2 ** 16) / (1024 * 1024);
        this.logger(`initial mem: ${initial} pages, ${initialMb}MiB. ` +
            `max mem: ${maximum} pages, ${maxMb}MiB. ` +
            `threads: ${threads}`);
        this.memory = new WebAssembly.Memory({ initial, maximum, shared: threads > 1 });
        // Annoyingly the wasm declares if it's memory is shared or not. So now we need two wasms if we want to be
        // able to fallback on "non shared memory" situations.
        const code = await (0, barretenberg_wasm_1.fetchCode)(threads > 1);
        const { instance, module } = await WebAssembly.instantiate(code, this.getImportObj(this.memory));
        this.instance = instance;
        // Init all global/static data.
        this.call('_initialize');
        // Create worker threads. Create 1 less than requested, as main thread counts as a thread.
        this.logger('creating worker threads...');
        this.workers = (await Promise.all(Array.from({ length: threads - 1 }).map(barretenberg_wasm_1.createWorker)));
        this.remoteWasms = await Promise.all(this.workers.map(barretenberg_wasm_1.getRemoteBarretenbergWasm));
        await Promise.all(this.remoteWasms.map(w => w.initThread(module, this.memory)));
        this.logger('init complete.');
    }
    /**
     * Init as worker thread.
     */
    async initThread(module, memory) {
        this.isThread = true;
        this.logger = (0, barretenberg_wasm_1.threadLogger)() || this.logger;
        this.memory = memory;
        this.instance = await WebAssembly.instantiate(module, this.getImportObj(this.memory));
    }
    /**
     * Called on main thread. Signals child threads to gracefully exit.
     */
    async destroy() {
        await Promise.all(this.workers.map(w => w.terminate()));
    }
    getImportObj(memory) {
        /* eslint-disable camelcase */
        const importObj = {
            // We need to implement a part of the wasi api:
            // https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md
            // We literally only need to support random_get, everything else is noop implementated in barretenberg.wasm.
            wasi_snapshot_preview1: {
                random_get: (out, length) => {
                    out = out >>> 0;
                    const randomData = (0, index_js_1.randomBytes)(length);
                    const mem = this.getMemory();
                    mem.set(randomData, out);
                },
                clock_time_get: (a1, a2, out) => {
                    out = out >>> 0;
                    const ts = BigInt(new Date().getTime()) * 1000000n;
                    const view = new DataView(this.getMemory().buffer);
                    view.setBigUint64(out, ts, true);
                },
                proc_exit: () => {
                    this.logger('PANIC: proc_exit was called. This is maybe caused by "joining" with unstable wasi pthreads.');
                    this.logger(new Error().stack);
                    (0, barretenberg_wasm_1.killSelf)();
                },
            },
            wasi: {
                'thread-spawn': (arg) => {
                    arg = arg >>> 0;
                    const id = this.nextThreadId++;
                    const worker = this.nextWorker++ % this.remoteWasms.length;
                    // this.logger(`spawning thread ${id} on worker ${worker} with arg ${arg >>> 0}`);
                    this.remoteWasms[worker].call('wasi_thread_start', id, arg).catch(this.logger);
                    // this.remoteWasms[worker].postMessage({ msg: 'thread', data: { id, arg } });
                    return id;
                },
            },
            // These are functions implementations for imports we've defined are needed.
            // The native C++ build defines these in a module called "env". We must implement TypeScript versions here.
            env: {
                env_hardware_concurrency: () => {
                    // If there are no workers (we're already running as a worker, or the main thread requested no workers)
                    // then we return 1, which should cause any algos using threading to just not create a thread.
                    return this.remoteWasms.length + 1;
                },
                /**
                 * The 'info' call we use for logging in C++, calls this under the hood.
                 * The native code will just print to std:err (to avoid std::cout which is used for IPC).
                 * Here we just emit the log line for the client to decide what to do with.
                 */
                logstr: (addr) => {
                    const str = this.stringFromAddress(addr);
                    const m = this.getMemory();
                    const str2 = `${str} (mem: ${(m.length / (1024 * 1024)).toFixed(2)}MiB)`;
                    this.logger(str2);
                    if (str2.startsWith('WARNING:')) {
                        this.logger(new Error().stack);
                    }
                },
                get_data: (keyAddr, outBufAddr) => {
                    const key = this.stringFromAddress(keyAddr);
                    outBufAddr = outBufAddr >>> 0;
                    const data = this.memStore[key];
                    if (!data) {
                        this.logger(`get_data miss ${key}`);
                        return;
                    }
                    // this.logger(`get_data hit ${key} size: ${data.length} dest: ${outBufAddr}`);
                    // this.logger(Buffer.from(data.slice(0, 64)).toString('hex'));
                    this.writeMemory(outBufAddr, data);
                },
                set_data: (keyAddr, dataAddr, dataLength) => {
                    const key = this.stringFromAddress(keyAddr);
                    dataAddr = dataAddr >>> 0;
                    this.memStore[key] = this.getMemorySlice(dataAddr, dataAddr + dataLength).slice();
                    // this.logger(`set_data: ${key} length: ${dataLength}`);
                },
                memory,
            },
        };
        /* eslint-enable camelcase */
        return importObj;
    }
    exports() {
        return this.instance.exports;
    }
    /**
     * When returning values from the WASM, use >>> operator to convert signed representation to unsigned representation.
     */
    call(name, ...args) {
        if (!this.exports()[name]) {
            throw new Error(`WASM function ${name} not found.`);
        }
        try {
            return this.exports()[name](...args) >>> 0;
        }
        catch (err) {
            const message = `WASM function ${name} aborted, error: ${err}`;
            this.logger(message);
            this.logger(err.stack);
            if (this.isThread) {
                (0, barretenberg_wasm_1.killSelf)();
            }
            else {
                throw err;
            }
        }
    }
    memSize() {
        return this.getMemory().length;
    }
    getMemorySlice(start, end) {
        return this.getMemory().subarray(start, end);
    }
    writeMemory(offset, arr) {
        const mem = this.getMemory();
        mem.set(arr, offset);
    }
    // PRIVATE METHODS
    getMemory() {
        return new Uint8Array(this.memory.buffer);
    }
    stringFromAddress(addr) {
        addr = addr >>> 0;
        const m = this.getMemory();
        let i = addr;
        for (; m[i] !== 0; ++i)
            ;
        const textDecoder = new TextDecoder('ascii');
        return textDecoder.decode(m.slice(addr, i));
    }
}
exports.BarretenbergWasm = BarretenbergWasm;
BarretenbergWasm.MAX_THREADS = 32;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFycmV0ZW5iZXJnX3dhc20uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYmFycmV0ZW5iZXJnX3dhc20vYmFycmV0ZW5iZXJnX3dhc20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUNBLG1DQUFzQztBQUN0QywwREFBZ0M7QUFDaEMscUNBQXdDO0FBQ3hDLGlEQUFpRDtBQUNqRCxpRUFPbUM7QUFFbkMsTUFBTSxLQUFLLEdBQUcsSUFBQSxlQUFXLEVBQUMsWUFBWSxDQUFDLENBQUM7QUFFeEMscUJBQVksQ0FBQyxtQkFBbUIsR0FBRyxFQUFFLENBQUM7QUFFdEMsTUFBYSxnQkFBZ0I7SUFBN0I7UUFFVSxhQUFRLEdBQWtDLEVBQUUsQ0FBQztRQUc3QyxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBQ3ZCLGdCQUFXLEdBQTZCLEVBQUUsQ0FBQztRQUMzQyxlQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsaUJBQVksR0FBRyxDQUFDLENBQUM7UUFDakIsYUFBUSxHQUFHLEtBQUssQ0FBQztRQUNqQixXQUFNLEdBQTBCLEtBQUssQ0FBQztJQTJOaEQsQ0FBQztJQXpOUSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUc7UUFDckIsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQzVDLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBZ0I7UUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQ0FBWSxHQUFFLENBQUM7UUFDOUIsTUFBTSxJQUFJLEdBQUcsSUFBQSw2Q0FBeUIsRUFBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUEsZUFBSyxFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDdkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU0sYUFBYTtRQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsSUFBSSxDQUNmLE9BQU8sR0FBRyxDQUFDLEVBQ1gsU0FBZ0MsS0FBSyxFQUNyQyxPQUFPLEdBQUcsRUFBRSxFQUNaLE9BQU8sR0FBRyxDQUFDLElBQUksRUFBRTtRQUVqQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUVyQixNQUFNLFNBQVMsR0FBRyxDQUFDLE9BQU8sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxNQUFNLENBQ1QsZ0JBQWdCLE9BQU8sV0FBVyxTQUFTLE9BQU87WUFDaEQsWUFBWSxPQUFPLFdBQVcsS0FBSyxPQUFPO1lBQzFDLFlBQVksT0FBTyxFQUFFLENBQ3hCLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWhGLDBHQUEwRztRQUMxRyxzREFBc0Q7UUFDdEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDZCQUFTLEVBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRWpHLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBRXpCLCtCQUErQjtRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRXpCLDBGQUEwRjtRQUMxRixJQUFJLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnQ0FBWSxDQUFDLENBQUMsQ0FBUSxDQUFDO1FBQ2pHLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUN6RixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQTBCLEVBQUUsTUFBMEI7UUFDNUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLGdDQUFZLEdBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxPQUFPO1FBQ2xCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVPLFlBQVksQ0FBQyxNQUEwQjtRQUM3Qyw4QkFBOEI7UUFDOUIsTUFBTSxTQUFTLEdBQUc7WUFDaEIsK0NBQStDO1lBQy9DLHdFQUF3RTtZQUN4RSw0R0FBNEc7WUFDNUcsc0JBQXNCLEVBQUU7Z0JBQ3RCLFVBQVUsRUFBRSxDQUFDLEdBQVEsRUFBRSxNQUFjLEVBQUUsRUFBRTtvQkFDdkMsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUM7b0JBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUEsc0JBQVcsRUFBQyxNQUFNLENBQUMsQ0FBQztvQkFDdkMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUM3QixHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDM0IsQ0FBQztnQkFDRCxjQUFjLEVBQUUsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLEdBQVcsRUFBRSxFQUFFO29CQUN0RCxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUM7b0JBQ25ELE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO2dCQUNELFNBQVMsRUFBRSxHQUFHLEVBQUU7b0JBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyw2RkFBNkYsQ0FBQyxDQUFDO29CQUMzRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUM7b0JBQ2hDLElBQUEsNEJBQVEsR0FBRSxDQUFDO2dCQUNiLENBQUM7YUFDRjtZQUNELElBQUksRUFBRTtnQkFDSixjQUFjLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRTtvQkFDOUIsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUM7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO29CQUMzRCxrRkFBa0Y7b0JBQ2xGLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUMvRSw4RUFBOEU7b0JBQzlFLE9BQU8sRUFBRSxDQUFDO2dCQUNaLENBQUM7YUFDRjtZQUVELDRFQUE0RTtZQUM1RSwyR0FBMkc7WUFDM0csR0FBRyxFQUFFO2dCQUNILHdCQUF3QixFQUFFLEdBQUcsRUFBRTtvQkFDN0IsdUdBQXVHO29CQUN2Ryw4RkFBOEY7b0JBQzlGLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxDQUFDO2dCQUNEOzs7O21CQUlHO2dCQUNILE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO29CQUN2QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3pDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDM0IsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7b0JBQ3pFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2xCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTt3QkFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFDO3FCQUNqQztnQkFDSCxDQUFDO2dCQUVELFFBQVEsRUFBRSxDQUFDLE9BQWUsRUFBRSxVQUFrQixFQUFFLEVBQUU7b0JBQ2hELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDNUMsVUFBVSxHQUFHLFVBQVUsS0FBSyxDQUFDLENBQUM7b0JBQzlCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxJQUFJLEVBQUU7d0JBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUMsQ0FBQzt3QkFDcEMsT0FBTztxQkFDUjtvQkFDRCwrRUFBK0U7b0JBQy9FLCtEQUErRDtvQkFDL0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7Z0JBRUQsUUFBUSxFQUFFLENBQUMsT0FBZSxFQUFFLFFBQWdCLEVBQUUsVUFBa0IsRUFBRSxFQUFFO29CQUNsRSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzVDLFFBQVEsR0FBRyxRQUFRLEtBQUssQ0FBQyxDQUFDO29CQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVEsR0FBRyxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbEYseURBQXlEO2dCQUMzRCxDQUFDO2dCQUVELE1BQU07YUFDUDtTQUNGLENBQUM7UUFDRiw2QkFBNkI7UUFFN0IsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVNLE9BQU87UUFDWixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQy9CLENBQUM7SUFFRDs7T0FFRztJQUNJLElBQUksQ0FBQyxJQUFZLEVBQUUsR0FBRyxJQUFTO1FBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSxhQUFhLENBQUMsQ0FBQztTQUNyRDtRQUNELElBQUk7WUFDRixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM1QztRQUFDLE9BQU8sR0FBUSxFQUFFO1lBQ2pCLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixJQUFJLG9CQUFvQixHQUFHLEVBQUUsQ0FBQztZQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDakIsSUFBQSw0QkFBUSxHQUFFLENBQUM7YUFDWjtpQkFBTTtnQkFDTCxNQUFNLEdBQUcsQ0FBQzthQUNYO1NBQ0Y7SUFDSCxDQUFDO0lBRU0sT0FBTztRQUNaLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNqQyxDQUFDO0lBRU0sY0FBYyxDQUFDLEtBQWEsRUFBRSxHQUFZO1FBQy9DLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVNLFdBQVcsQ0FBQyxNQUFjLEVBQUUsR0FBZTtRQUNoRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDN0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVELGtCQUFrQjtJQUVWLFNBQVM7UUFDZixPQUFPLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVPLGlCQUFpQixDQUFDLElBQVk7UUFDcEMsSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNiLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7WUFBQyxDQUFDO1FBQ3hCLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlDLENBQUM7O0FBcE9ILDRDQXFPQztBQXBPUSw0QkFBVyxHQUFHLEVBQUUsQUFBTCxDQUFNIn0=

/***/ }),

/***/ 581:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.killSelf = exports.threadLogger = exports.getNumCpu = exports.getRemoteBarretenbergWasm = exports.createWorker = exports.fetchCode = void 0;
const tslib_1 = __webpack_require__(582);
const comlink_1 = __webpack_require__(375);
const debug_1 = tslib_1.__importDefault(__webpack_require__(227));
async function fetchCode(multithreading) {
    const wasmModuleUrl = new URL(/* asset import */ __webpack_require__(90), __webpack_require__.b);
    const res = await fetch(wasmModuleUrl.href);
    return await res.arrayBuffer();
}
exports.fetchCode = fetchCode;
function createWorker() {
    const worker = new Worker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u(995), __webpack_require__.b));
    const debugStr = debug_1.default.disable();
    debug_1.default.enable(debugStr);
    worker.postMessage({ debug: debugStr });
    return worker;
}
exports.createWorker = createWorker;
function getRemoteBarretenbergWasm(worker) {
    return (0, comlink_1.wrap)(worker);
}
exports.getRemoteBarretenbergWasm = getRemoteBarretenbergWasm;
function getNumCpu() {
    return navigator.hardwareConcurrency;
}
exports.getNumCpu = getNumCpu;
function threadLogger() {
    return undefined;
}
exports.threadLogger = threadLogger;
function killSelf() {
    self.close();
}
exports.killSelf = killSelf;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYmFycmV0ZW5iZXJnX3dhc20vYnJvd3Nlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEscUNBQStCO0FBRS9CLDBEQUEwQjtBQUVuQixLQUFLLFVBQVUsU0FBUyxDQUFDLGNBQXVCO0lBQ3JELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDMUUsTUFBTSxHQUFHLEdBQUcsTUFBTSxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVDLE9BQU8sTUFBTSxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDakMsQ0FBQztBQUpELDhCQUlDO0FBRUQsU0FBZ0IsWUFBWTtJQUMxQixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sUUFBUSxHQUFHLGVBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQyxlQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUN4QyxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBTkQsb0NBTUM7QUFFRCxTQUFnQix5QkFBeUIsQ0FBQyxNQUFjO0lBQ3RELE9BQU8sSUFBQSxjQUFJLEVBQW1CLE1BQU0sQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFGRCw4REFFQztBQUVELFNBQWdCLFNBQVM7SUFDdkIsT0FBTyxTQUFTLENBQUMsbUJBQW1CLENBQUM7QUFDdkMsQ0FBQztBQUZELDhCQUVDO0FBRUQsU0FBZ0IsWUFBWTtJQUMxQixPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDO0FBRkQsb0NBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNmLENBQUM7QUFGRCw0QkFFQyJ9

/***/ }),

/***/ 285:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const tslib_1 = __webpack_require__(582);
const comlink_1 = __webpack_require__(375);
const index_js_1 = __webpack_require__(995);
const debug_1 = tslib_1.__importDefault(__webpack_require__(227));
self.onmessage = function (e) {
    if (e.data.debug) {
        debug_1.default.enable(e.data.debug);
    }
};
(0, comlink_1.expose)(new index_js_1.BarretenbergWasm());
self.postMessage({ ready: true });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2JhcnJldGVuYmVyZ193YXNtL2Jyb3dzZXIvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFDQUFpQztBQUNqQywwQ0FBK0M7QUFDL0MsMERBQTBCO0FBRTFCLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDO0lBQzFCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDaEIsZUFBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQzVCO0FBQ0gsQ0FBQyxDQUFDO0FBRUYsSUFBQSxnQkFBTSxFQUFDLElBQUksMkJBQWdCLEVBQUUsQ0FBQyxDQUFDO0FBRS9CLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyJ9

/***/ }),

/***/ 995:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(582);
tslib_1.__exportStar(__webpack_require__(640), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYmFycmV0ZW5iZXJnX3dhc20vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaUVBQXVDIn0=

/***/ }),

/***/ 754:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.randomBytes = void 0;
const randomBytes = (len) => {
    const getWebCrypto = () => {
        if (typeof window !== 'undefined' && window.crypto)
            return window.crypto;
        if (typeof self !== 'undefined' && self.crypto)
            return self.crypto;
        return undefined;
    };
    const crypto = getWebCrypto();
    if (!crypto) {
        throw new Error('randomBytes UnsupportedEnvironment');
    }
    const buf = new Uint8Array(len);
    // limit of Crypto.getRandomValues()
    // https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
    const MAX_BYTES = 65536;
    if (len > MAX_BYTES) {
        // this is the max bytes crypto.getRandomValues
        // can do at once see https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
        for (let generated = 0; generated < len; generated += MAX_BYTES) {
            // buffer.slice automatically checks if the end is past the end of
            // the buffer so we don't have to here
            crypto.getRandomValues(buf.subarray(generated, generated + MAX_BYTES));
        }
    }
    else {
        crypto.getRandomValues(buf);
    }
    return buf;
};
exports.randomBytes = randomBytes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcmFuZG9tL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQU8sTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRTtJQUN6QyxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUU7UUFDeEIsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLElBQUksTUFBTSxDQUFDLE1BQU07WUFBRSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDekUsSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLElBQUksSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDbkUsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQyxDQUFDO0lBRUYsTUFBTSxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUM7SUFDOUIsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztLQUN2RDtJQUVELE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRWhDLG9DQUFvQztJQUNwQywwRUFBMEU7SUFDMUUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBRXhCLElBQUksR0FBRyxHQUFHLFNBQVMsRUFBRTtRQUNuQiwrQ0FBK0M7UUFDL0Msb0dBQW9HO1FBQ3BHLEtBQUssSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxHQUFHLEVBQUUsU0FBUyxJQUFJLFNBQVMsRUFBRTtZQUMvRCxrRUFBa0U7WUFDbEUsc0NBQXNDO1lBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDeEU7S0FDRjtTQUFNO1FBQ0wsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUM3QjtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxDQUFDO0FBL0JXLFFBQUEsV0FBVyxlQStCdEIifQ==

/***/ }),

/***/ 324:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(582);
tslib_1.__exportStar(__webpack_require__(754), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcmFuZG9tL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlEQUErQiJ9

/***/ }),

/***/ 90:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "e738aa3216512aada86a.wasm";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, [539], () => (__webpack_require__(285)))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && !scriptUrl) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = self.location + "";
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			995: 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk_aztec_bb_js"] = self["webpackChunk_aztec_bb_js"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			return __webpack_require__.e(539).then(next);
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ })()
;
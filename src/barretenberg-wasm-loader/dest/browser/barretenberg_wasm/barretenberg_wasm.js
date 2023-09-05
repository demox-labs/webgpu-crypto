import { EventEmitter } from 'events';
import createDebug from 'debug';
import { proxy } from 'comlink';
import { randomBytes } from '../random/index.js';
import { fetchCode, createWorker, getRemoteBarretenbergWasm, threadLogger, killSelf, } from './browser/index.js';
const debug = createDebug('bb.js:wasm');
EventEmitter.defaultMaxListeners = 30;
export class BarretenbergWasm {
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
        const worker = createWorker();
        const wasm = getRemoteBarretenbergWasm(worker);
        await wasm.init(threads, proxy(debug));
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
        const code = await fetchCode(threads > 1);
        const { instance, module } = await WebAssembly.instantiate(code, this.getImportObj(this.memory));
        this.instance = instance;
        // Init all global/static data.
        this.call('_initialize');
        // Create worker threads. Create 1 less than requested, as main thread counts as a thread.
        this.logger('creating worker threads...');
        this.workers = (await Promise.all(Array.from({ length: threads - 1 }).map(createWorker)));
        this.remoteWasms = await Promise.all(this.workers.map(getRemoteBarretenbergWasm));
        await Promise.all(this.remoteWasms.map(w => w.initThread(module, this.memory)));
        this.logger('init complete.');
    }
    /**
     * Init as worker thread.
     */
    async initThread(module, memory) {
        this.isThread = true;
        this.logger = threadLogger() || this.logger;
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
                    const randomData = randomBytes(length);
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
                    killSelf();
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
                killSelf();
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
BarretenbergWasm.MAX_THREADS = 32;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFycmV0ZW5iZXJnX3dhc20uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYmFycmV0ZW5iZXJnX3dhc20vYmFycmV0ZW5iZXJnX3dhc20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN0QyxPQUFPLFdBQVcsTUFBTSxPQUFPLENBQUM7QUFDaEMsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDakQsT0FBTyxFQUNMLFNBQVMsRUFFVCxZQUFZLEVBQ1oseUJBQXlCLEVBQ3pCLFlBQVksRUFDWixRQUFRLEdBQ1QsTUFBTSwyQkFBMkIsQ0FBQztBQUVuQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFeEMsWUFBWSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztBQUV0QyxNQUFNLE9BQU8sZ0JBQWdCO0lBQTdCO1FBRVUsYUFBUSxHQUFrQyxFQUFFLENBQUM7UUFHN0MsWUFBTyxHQUFhLEVBQUUsQ0FBQztRQUN2QixnQkFBVyxHQUE2QixFQUFFLENBQUM7UUFDM0MsZUFBVSxHQUFHLENBQUMsQ0FBQztRQUNmLGlCQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLGFBQVEsR0FBRyxLQUFLLENBQUM7UUFDakIsV0FBTSxHQUEwQixLQUFLLENBQUM7SUEyTmhELENBQUM7SUF6TlEsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHO1FBQ3JCLE1BQU0sWUFBWSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUM1QyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9B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
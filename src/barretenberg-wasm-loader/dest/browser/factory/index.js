import { BarretenbergApi, BarretenbergApiSync } from '../barretenberg_api/index.js';
import { BarretenbergBinder, BarretenbergBinderSync } from '../barretenberg_binder/index.js';
import { BarretenbergWasm } from '../barretenberg_wasm/index.js';
/**
 * Returns a single threaded, synchronous, barretenberg api.
 * Can be used on the main thread to perform small light-weight requests like hashing etc.
 */
export async function newBarretenbergApiSync() {
    return new BarretenbergApiSync(new BarretenbergBinderSync(await BarretenbergWasm.new()));
}
export class BarretenbergApiAsync extends BarretenbergApi {
    constructor(worker, wasm) {
        super(new BarretenbergBinder(wasm));
        this.worker = worker;
        this.wasm = wasm;
    }
    async getNumThreads() {
        return await this.wasm.getNumThreads();
    }
    async destroy() {
        await this.wasm.destroy();
        await this.worker.terminate();
    }
}
/**
 * Returns a multi threaded, asynchronous, barretenberg api.
 * It runs in a worker, and so can be used within the browser to execute long running, multi-threaded requests
 * like proof construction etc.
 */
export async function newBarretenbergApiAsync(threads) {
    const { wasm, worker } = await BarretenbergWasm.newWorker(threads);
    return new BarretenbergApiAsync(worker, wasm);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZmFjdG9yeS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLCtCQUErQixDQUFDO0FBRXpGOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsc0JBQXNCO0lBQzFDLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLE1BQU0sZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUM7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsZUFBZTtJQUN2RCxZQUFvQixNQUFXLEVBQVUsSUFBNEI7UUFDbkUsS0FBSyxDQUFDLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQURsQixXQUFNLEdBQU4sTUFBTSxDQUFLO1FBQVUsU0FBSSxHQUFKLElBQUksQ0FBd0I7SUFFckUsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhO1FBQ2pCLE9BQU8sTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTztRQUNYLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxQixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDaEMsQ0FBQztDQUNGO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsdUJBQXVCLENBQUMsT0FBZ0I7SUFDNUQsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNuRSxPQUFPLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2hELENBQUMifQ==
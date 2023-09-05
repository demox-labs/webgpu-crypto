import { HeapAllocator } from './heap_allocator.js';
import { asyncMap } from '../async_map/index.js';
import { HeapAllocatorSync } from './heap_allocator_sync.js';
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
export class BarretenbergBinder {
    constructor(wasm) {
        this.wasm = wasm;
    }
    async callWasmExport(funcName, inArgs, outTypes) {
        const alloc = new HeapAllocator(this.wasm);
        const inPtrs = await alloc.copyToMemory(inArgs);
        const outPtrs = await alloc.getOutputPtrs(outTypes);
        await this.wasm.call(funcName, ...inPtrs, ...outPtrs);
        const outArgs = this.deserializeOutputArgs(outTypes, outPtrs, alloc);
        await alloc.freeAll();
        return outArgs;
    }
    deserializeOutputArgs(outTypes, outPtrs, alloc) {
        return asyncMap(outTypes, async (t, i) => {
            if (t.SIZE_IN_BYTES) {
                const slice = await this.wasm.getMemorySlice(outPtrs[i], outPtrs[i] + t.SIZE_IN_BYTES);
                return t.fromBuffer(slice);
            }
            const slice = await this.wasm.getMemorySlice(outPtrs[i], outPtrs[i] + 4);
            const ptr = new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getUint32(0, true);
            alloc.addOutputPtr(ptr);
            return t.fromBuffer(await this.wasm.getMemorySlice(ptr));
        });
    }
}
export class BarretenbergBinderSync {
    constructor(wasm) {
        this.wasm = wasm;
    }
    callWasmExport(funcName, inArgs, outTypes) {
        const alloc = new HeapAllocatorSync(this.wasm);
        const inPtrs = alloc.copyToMemory(inArgs);
        const outPtrs = alloc.getOutputPtrs(outTypes);
        this.wasm.call(funcName, ...inPtrs, ...outPtrs);
        const outArgs = this.deserializeOutputArgs(outTypes, outPtrs, alloc);
        alloc.freeAll();
        return outArgs;
    }
    deserializeOutputArgs(outTypes, outPtrs, alloc) {
        return outTypes.map((t, i) => {
            if (t.SIZE_IN_BYTES) {
                const slice = this.wasm.getMemorySlice(outPtrs[i], outPtrs[i] + t.SIZE_IN_BYTES);
                return t.fromBuffer(slice);
            }
            const slice = this.wasm.getMemorySlice(outPtrs[i], outPtrs[i] + 4);
            const ptr = new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getUint32(0, true);
            alloc.addOutputPtr(ptr);
            return t.fromBuffer(this.wasm.getMemorySlice(ptr));
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYmFycmV0ZW5iZXJnX2JpbmRlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTdEOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUM3QixZQUFtQixJQUErQztRQUEvQyxTQUFJLEdBQUosSUFBSSxDQUEyQztJQUFHLENBQUM7SUFFdEUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFnQixFQUFFLE1BQW9CLEVBQUUsUUFBc0I7UUFDakYsTUFBTSxLQUFLLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBRyxNQUFNLEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN0RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRSxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRU8scUJBQXFCLENBQUMsUUFBc0IsRUFBRSxPQUFpQixFQUFFLEtBQW9CO1FBQzNGLE9BQU8sUUFBUSxDQUFDLFFBQVEs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
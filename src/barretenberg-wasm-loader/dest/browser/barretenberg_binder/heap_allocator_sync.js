import { serializeBufferable } from '../serialize/index.js';
/**
 * Keeps track of heap allocations so they can be easily freed.
 * The WASM memory layout has 1024 bytes of unused "scratch" space at the start (addresses 0-1023).
 * We can leverage this for IO rather than making expensive bb_malloc bb_free calls.
 * Heap allocations will be created for input/output args that don't fit into the scratch space.
 * Input and output args can use the same scratch space as it's assume all input reads will be performed before any
 * output writes are performed.
 */
export class HeapAllocatorSync {
    constructor(wasm) {
        this.wasm = wasm;
        this.allocs = [];
        this.inScratchRemaining = 1024;
        this.outScratchRemaining = 1024;
    }
    copyToMemory(bufferable) {
        return bufferable.map(serializeBufferable).map(buf => {
            if (buf.length <= this.inScratchRemaining) {
                const ptr = (this.inScratchRemaining -= buf.length);
                this.wasm.writeMemory(ptr, buf);
                return ptr;
            }
            else {
                const ptr = this.wasm.call('bbmalloc', buf.length);
                this.wasm.writeMemory(ptr, buf);
                this.allocs.push(ptr);
                return ptr;
            }
        });
    }
    getOutputPtrs(objs) {
        return objs.map(obj => {
            // If the obj is variable length, we need a 4 byte ptr to write the serialized data address to.
            // WARNING: 4 only works with WASM as it has 32 bit memory.
            const size = obj.SIZE_IN_BYTES || 4;
            if (size <= this.outScratchRemaining) {
                return (this.outScratchRemaining -= size);
            }
            else {
                const ptr = this.wasm.call('bbmalloc', size);
                this.allocs.push(ptr);
                return ptr;
            }
        });
    }
    addOutputPtr(ptr) {
        if (ptr >= 1024) {
            this.allocs.push(ptr);
        }
    }
    freeAll() {
        for (const ptr of this.allocs) {
            this.wasm.call('bbfree', ptr);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhcF9hbGxvY2F0b3Jfc3luYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9iYXJyZXRlbmJlcmdfYmluZGVyL2hlYXBfYWxsb2NhdG9yX3N5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFjLG1CQUFtQixFQUFjLE1BQU0sdUJBQXVCLENBQUM7QUFHcEY7Ozs7Ozs7R0FPRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFLNUIsWUFBb0IsSUFBc0I7UUFBdEIsU0FBSSxHQUFKLElBQUksQ0FBa0I7UUFKbEMsV0FBTSxHQUFhLEVBQUUsQ0FBQztRQUN0Qix1QkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDMUIsd0JBQW1CLEdBQUcsSUFBSSxDQUFDO0lBRVUsQ0FBQztJQUU5QyxZQUFZLENBQUMsVUFBd0I7UUFDbkMsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ25ELElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ3pDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxPQUFPLEdBQUcsQ0FBQzthQUNaO2lCQUFNO2dCQUNMLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLE9BQU8sR0FBRyxDQUFDO2FBQ1o7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBa0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3BCLCtGQUErRjtZQUMvRiwyREFBMkQ7WUFDM0QsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUM7WUFFcEMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO2dCQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQyxDQUFDO2FBQzNDO2lCQUFNO2dCQUNMLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLE9BQU8sR0FBRyxDQUFDO2FBQ1o7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxZQUFZLENBQUMsR0FBVztRQUN0QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN2QjtJQUNILENBQUM7SUFFRCxPQUFPO1FBQ0wsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUMvQjtJQUNILENBQUM7Q0FDRiJ9
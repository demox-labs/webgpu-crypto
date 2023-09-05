import { serializeBufferable } from '../serialize/index.js';
import { asyncMap } from '../async_map/index.js';
/**
 * Keeps track of heap allocations so they can be easily freed.
 * The WASM memory layout has 1024 bytes of unused "scratch" space at the start (addresses 0-1023).
 * We can leverage this for IO rather than making expensive bb_malloc bb_free calls.
 * Heap allocations will be created for input/output args that don't fit into the scratch space.
 * Input and output args can use the same scratch space as it's assume all input reads will be performed before any
 * output writes are performed.
 */
export class HeapAllocator {
    constructor(wasm) {
        this.wasm = wasm;
        this.allocs = [];
        this.inScratchRemaining = 1024;
        this.outScratchRemaining = 1024;
    }
    async copyToMemory(bufferable) {
        return await asyncMap(bufferable.map(serializeBufferable), async (buf) => {
            if (buf.length <= this.inScratchRemaining) {
                const ptr = (this.inScratchRemaining -= buf.length);
                await this.wasm.writeMemory(ptr, buf);
                return ptr;
            }
            else {
                const ptr = await this.wasm.call('bbmalloc', buf.length);
                await this.wasm.writeMemory(ptr, buf);
                this.allocs.push(ptr);
                return ptr;
            }
        });
    }
    async getOutputPtrs(objs) {
        return await asyncMap(objs, async (obj) => {
            // If the obj is variable length, we need a 4 byte ptr to write the serialized data address to.
            // WARNING: 4 only works with WASM as it has 32 bit memory.
            const size = obj.SIZE_IN_BYTES || 4;
            if (size <= this.outScratchRemaining) {
                return (this.outScratchRemaining -= size);
            }
            else {
                const ptr = await this.wasm.call('bbmalloc', size);
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
    async freeAll() {
        for (const ptr of this.allocs) {
            await this.wasm.call('bbfree', ptr);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhcF9hbGxvY2F0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYmFycmV0ZW5iZXJnX2JpbmRlci9oZWFwX2FsbG9jYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWMsbUJBQW1CLEVBQWMsTUFBTSx1QkFBdUIsQ0FBQztBQUVwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQ7Ozs7Ozs7R0FPRztBQUNILE1BQU0sT0FBTyxhQUFhO0lBS3hCLFlBQW9CLElBQStDO1FBQS9DLFNBQUksR0FBSixJQUFJLENBQTJDO1FBSjNELFdBQU0sR0FBYSxFQUFFLENBQUM7UUFDdEIsdUJBQWtCLEdBQUcsSUFBSSxDQUFDO1FBQzFCLHdCQUFtQixHQUFHLElBQUksQ0FBQztJQUVtQyxDQUFDO0lBRXZFLEtBQUssQ0FBQyxZQUFZLENBQUMsVUFBd0I7UUFDekMsT0FBTyxNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsS0FBSyxFQUFDLEdBQUcsRUFBQyxFQUFFO1lBQ3JFLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ3pDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3RDLE9BQU8sR0FBRyxDQUFDO2FBQ1o7aUJBQU07Z0JBQ0wsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLE9BQU8sR0FBRyxDQUFDO2FBQ1o7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQWtCO1FBQ3BDLE9BQU8sTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxHQUFHLEVBQUMsRUFBRTtZQUN0QywrRkFBK0Y7WUFDL0YsMkRBQTJEO1lBQzNELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDO1lBRXBDLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtnQkFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsQ0FBQzthQUMzQztpQkFBTTtnQkFDTCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLE9BQU8sR0FBRyxDQUFDO2FBQ1o7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxZQUFZLENBQUMsR0FBVztRQUN0QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN2QjtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTztRQUNYLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM3QixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNyQztJQUNILENBQUM7Q0FDRiJ9
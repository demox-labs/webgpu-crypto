import { NetCrs } from '../net_crs.js';
import { IgnitionFilesCrs } from './ignition_files_crs.js';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import createDebug from 'debug';
const debug = createDebug('bb.js:crs');
/**
 * Generic CRS finder utility class.
 */
export class Crs {
    constructor(numPoints, path) {
        this.numPoints = numPoints;
        this.path = path;
    }
    static async new(numPoints, crsPath = './crs') {
        const crs = new Crs(numPoints, crsPath);
        await crs.init();
        return crs;
    }
    async init() {
        mkdirSync(this.path, { recursive: true });
        const size = await readFile(this.path + '/size', 'ascii').catch(() => undefined);
        if (size && +size >= this.numPoints) {
            debug(`using cached crs of size: ${size}`);
            return;
        }
        const crs = IgnitionFilesCrs.defaultExists() ? new IgnitionFilesCrs(this.numPoints) : new NetCrs(this.numPoints);
        if (crs instanceof NetCrs) {
            debug(`downloading crs of size: ${this.numPoints}`);
        }
        else {
            debug(`loading igntion file crs of size: ${this.numPoints}`);
        }
        await crs.init();
        writeFileSync(this.path + '/size', this.numPoints.toString());
        writeFileSync(this.path + '/g1.dat', crs.getG1Data());
        writeFileSync(this.path + '/g2.dat', crs.getG2Data());
    }
    /**
     * G1 points data for prover key.
     * @returns The points data.
     */
    getG1Data() {
        return readFileSync(this.path + '/g1.dat');
    }
    /**
     * G2 points data for verification key.
     * @returns The points data.
     */
    getG2Data() {
        return readFileSync(this.path + '/g2.dat');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY3JzL25vZGUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN2QyxPQUFPLFdBQVcsTUFBTSxPQUFPLENBQUM7QUFFaEMsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXZDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLEdBQUc7SUFDZCxZQUE0QixTQUFpQixFQUFrQixJQUFZO1FBQS9DLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFBa0IsU0FBSSxHQUFKLElBQUksQ0FBUTtJQUFHLENBQUM7SUFFL0UsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBaUIsRUFBRSxPQUFPLEdBQUcsT0FBTztRQUNuRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUk7UUFDUixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRixJQUFJLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ25DLEtBQUssQ0FBQyw2QkFBNkIsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMzQyxPQUFPO1NBQ1I7UUFFRCxNQUFNLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqSCxJQUFJLEdBQUcsWUFBWSxNQUFNLEVBQUU7WUFDekIsS0FBSyxDQUFDLDRCQUE0QixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztTQUNyRDthQUFNO1lBQ0wsS0FBSyxDQUFDLHFDQUFxQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztTQUM5RDtRQUNELE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pCLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDOUQsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUztRQUNQLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVEOzs7T0FHRztJQUNILFNBQVM7UUFDUCxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDO0lBQzdDLENBQUM7Q0FDRiJ9
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
/**
 * The path to our SRS object, assuming that we are in barretenberg/ts folder.
 */
export const SRS_DEV_PATH = dirname(fileURLToPath(import.meta.url)) + '/../../../cpp/srs_db/ignition/monomial';
/**
 * Downloader for CRS from a local file (for Node).
 */
export class IgnitionFilesCrs {
    constructor(
    /**
     * The number of circuit gates.
     */
    numPoints, path = SRS_DEV_PATH) {
        this.numPoints = numPoints;
        this.path = path;
    }
    static defaultExists() {
        return existsSync(SRS_DEV_PATH);
    }
    /**
     * Read the data file.
     */
    async init() {
        // We need this.numPoints number of g1 points.
        // numPoints should be circuitSize + 1.
        const g1Start = 28;
        const g1End = g1Start + this.numPoints * 64;
        const data = await readFile(this.path + '/transcript00.dat');
        this.data = data.subarray(g1Start, g1End);
        this.g2Data = await readFile(this.path + '/g2.dat');
    }
    /**
     * G1 points data for prover key.
     * @returns The points data.
     */
    getG1Data() {
        return this.data;
    }
    /**
     * G2 points data for verification key.
     * @returns The points data.
     */
    getG2Data() {
        return this.g2Data;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWduaXRpb25fZmlsZXNfY3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2Nycy9ub2RlL2lnbml0aW9uX2ZpbGVzX2Nycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUMvQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBRXBDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLHdDQUF3QyxDQUFDO0FBRS9HOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGdCQUFnQjtJQUkzQjtJQUNFOztPQUVHO0lBQ2EsU0FBaUIsRUFDekIsT0FBTyxZQUFZO1FBRFgsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUN6QixTQUFJLEdBQUosSUFBSSxDQUFlO0lBQzFCLENBQUM7SUFFSixNQUFNLENBQUMsYUFBYTtRQUNsQixPQUFPLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsSUFBSTtRQUNSLDhDQUE4QztRQUM5Qyx1Q0FBdUM7UUFDdkMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ25CLE1BQU0sS0FBSyxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUU1QyxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLG1CQUFtQixDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVEOzs7T0FHRztJQUNILFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7T0FHRztJQUNILFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztDQUNGIn0=
import { NetCrs } from '../net_crs.js';
import { get, set } from 'idb-keyval';
/**
 * Downloader for CRS from the web or local.
 */
export class CachedNetCrs {
    constructor(numPoints) {
        this.numPoints = numPoints;
    }
    // This is to keep signrature equal with the node version of CRS
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async new(numPoints, _) {
        const crs = new CachedNetCrs(numPoints);
        await crs.init();
        return crs;
    }
    /**
     * Download the data.
     */
    async init() {
        // Check if data is in IndexedDB
        const g1Data = await get('g1Data');
        const g2Data = await get('g2Data');
        const netCrs = new NetCrs(this.numPoints);
        const g1DataLength = this.numPoints * 64;
        if (!g1Data || g1Data.length < g1DataLength) {
            this.g1Data = await netCrs.downloadG1Data();
            await set('g1Data', this.g1Data);
        }
        else {
            this.g1Data = g1Data;
        }
        if (!g2Data) {
            this.g2Data = await netCrs.downloadG2Data();
            await set('g2Data', this.g2Data);
        }
        else {
            this.g2Data = g2Data;
        }
    }
    /**
     * G1 points data for prover key.
     * @returns The points data.
     */
    getG1Data() {
        return this.g1Data;
    }
    /**
     * G2 points data for verification key.
     * @returns The points data.
     */
    getG2Data() {
        return this.g2Data;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVkX25ldF9jcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY3JzL2Jyb3dzZXIvY2FjaGVkX25ldF9jcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV0Qzs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBSXZCLFlBQTRCLFNBQWlCO1FBQWpCLGNBQVMsR0FBVCxTQUFTLENBQVE7SUFBRyxDQUFDO0lBRWpELGdFQUFnRTtJQUNoRSw2REFBNkQ7SUFDN0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBaUIsRUFBRSxDQUFVO1FBQzVDLE1BQU0sR0FBRyxHQUFHLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pCLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLElBQUk7UUFDUixnQ0FBZ0M7UUFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBRXpDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxZQUFZLEVBQUU7WUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM1QyxNQUFNLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDTCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztTQUN0QjtRQUVELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzVDLE1BQU0sR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbEM7YUFBTTtZQUNMLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1NBQ3RCO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7T0FHRztJQUNILFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztDQUNGIn0=
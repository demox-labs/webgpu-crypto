/**
 * Downloader for CRS from the web or local.
 */
export class NetCrs {
    constructor(
    /**
     * The number of circuit gates.
     */
    numPoints) {
        this.numPoints = numPoints;
    }
    /**
     * Download the data.
     */
    async init() {
        await this.downloadG1Data();
        await this.downloadG2Data();
    }
    async downloadG1Data() {
        const g1Start = 28;
        const g1End = g1Start + this.numPoints * 64 - 1;
        const response = await fetch('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/monomial/transcript00.dat', {
            headers: {
                Range: `bytes=${g1Start}-${g1End}`,
            },
            cache: 'force-cache',
        });
        return (this.data = new Uint8Array(await response.arrayBuffer()));
    }
    /**
     * Download the G2 points data.
     */
    async downloadG2Data() {
        const g2Start = 28 + 5040001 * 64;
        const g2End = g2Start + 128 - 1;
        const response2 = await fetch('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/monomial/transcript00.dat', {
            headers: {
                Range: `bytes=${g2Start}-${g2End}`,
            },
            cache: 'force-cache',
        });
        return (this.g2Data = new Uint8Array(await response2.arrayBuffer()));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0X2Nycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jcnMvbmV0X2Nycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE1BQU0sT0FBTyxNQUFNO0lBSWpCO0lBQ0U7O09BRUc7SUFDYSxTQUFpQjtRQUFqQixjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQ2hDLENBQUM7SUFFSjs7T0FFRztJQUNILEtBQUssQ0FBQyxJQUFJO1FBQ1IsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDNUIsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjO1FBQ2xCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNuQixNQUFNLEtBQUssR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRWhELE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLG1GQUFtRixFQUFFO1lBQ2hILE9BQU8sRUFBRTtnQkFDUCxLQUFLLEVBQUUsU0FBUyxPQUFPLElBQUksS0FBSyxFQUFFO2FBQ25DO1lBQ0QsS0FBSyxFQUFFLGFBQWE7U0FDckIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjO1FBQ2xCLE1BQU0sT0FBTyxHQUFHLEVBQUUsR0FBRyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLE9BQU8sR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBRWhDLE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxDQUFDLG1GQUFtRixFQUFFO1lBQ2pILE9BQU8sRUFBRTtnQkFDUCxLQUFLLEVBQUUsU0FBUyxPQUFPLElBQUksS0FBSyxFQUFFO2FBQ25DO1lBQ0QsS0FBSyxFQUFFLGFBQWE7U0FDckIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTO1FBQ1AsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTO1FBQ1AsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7Q0FDRiJ9
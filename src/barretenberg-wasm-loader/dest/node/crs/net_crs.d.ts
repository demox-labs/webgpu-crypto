/**
 * Downloader for CRS from the web or local.
 */
export declare class NetCrs {
    /**
     * The number of circuit gates.
     */
    readonly numPoints: number;
    private data;
    private g2Data;
    constructor(
    /**
     * The number of circuit gates.
     */
    numPoints: number);
    /**
     * Download the data.
     */
    init(): Promise<void>;
    downloadG1Data(): Promise<Uint8Array>;
    /**
     * Download the G2 points data.
     */
    downloadG2Data(): Promise<Uint8Array>;
    /**
     * G1 points data for prover key.
     * @returns The points data.
     */
    getG1Data(): Uint8Array;
    /**
     * G2 points data for verification key.
     * @returns The points data.
     */
    getG2Data(): Uint8Array;
}
//# sourceMappingURL=net_crs.d.ts.map
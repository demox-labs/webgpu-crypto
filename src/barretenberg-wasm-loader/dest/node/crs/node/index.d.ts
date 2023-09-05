/**
 * Generic CRS finder utility class.
 */
export declare class Crs {
    readonly numPoints: number;
    readonly path: string;
    constructor(numPoints: number, path: string);
    static new(numPoints: number, crsPath?: string): Promise<Crs>;
    init(): Promise<void>;
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
//# sourceMappingURL=index.d.ts.map
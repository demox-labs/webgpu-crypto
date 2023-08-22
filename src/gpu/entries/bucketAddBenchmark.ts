import { ExtPointType } from "@noble/curves/abstract/edwards";
import { FieldMath } from "../../utils/FieldMath";

const initializeBucket = (fieldMath: FieldMath, c: number): Map<number, ExtPointType> => {
    const T = new Map();
    for (let i = 0; i < Math.pow(2, c); i++) {
        T.set(i, fieldMath.customEdwards.ExtendedPoint.ZERO);
    }
    return T;
}

export const bucket_add_benchmark = async (points: ExtPointType[], scalars: number[], fieldMath: FieldMath) => {
    const C = 16;
    const arraySize = 2;

    ///
    /// DICTIONARY SETUP
    ///
    // Need to setup our 16 MSM (T_1, T_2, ..., T_16). We'll do this
    // by via the bucket method for each MSM
    let start = performance.now();
    const msms = [];
    for (let i = 0; i < 16; i++) {
        msms.push(initializeBucket(fieldMath, 16));
    }
    let end = performance.now();
    console.log(`Time taken to create 16 Maps: ${end - start} milliseconds`);

    ///
    /// BUCKET METHOD
    ///
    start = performance.now();
    let scalarIndex = 0;
    let pointsIndex = 0;
    let numCpuAdditions = 0;
    while (pointsIndex < points.length) {
        
        const scalar = scalars[scalarIndex];
        const pointToAdd = points[pointsIndex];

        const msmIndex = scalarIndex % C;
        
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const currentPoint = msms[msmIndex].get(scalar)!;
        msms[msmIndex].set(scalar, currentPoint.add(pointToAdd));
        numCpuAdditions += 1;
        
        scalarIndex += 1;
        if (scalarIndex % C == 0) {
            pointsIndex += 1;
        }
    }
    end = performance.now();
    console.log(`Number of CPU additions: ${numCpuAdditions}`);
    console.log(`Time taken to apply bucket method: ${end - start} milliseconds`);

    console.log(msms);

    const affinePoint = msms[0].get(0)?.toAffine();
    console.log(affinePoint);
    return new Uint32Array();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_add = bucket_add_benchmark;
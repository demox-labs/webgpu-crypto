import { ExtPointType } from "@noble/curves/abstract/edwards";
import { FieldMath } from "../../utils/FieldMath";
import { bigIntToU32Array, bigIntsToU32Array, u32ArrayToBigInts } from "../utils";

export const addManyPointsBenchmarkV2= async (points: ExtPointType[], fieldMath: FieldMath) => {
    const bucketSize = 2;
    const numberOfBuckets = Math.ceil(points.length / bucketSize);

    // Flatten the array and extend with zeros
    const flattened = points.concat(new Array(bucketSize * numberOfBuckets - points.length).fill(fieldMath.customEdwards.ExtendedPoint.ZERO));

    const buckets = [];
    for (let i = 0; i < flattened.length; i += bucketSize) {
        buckets.push(flattened.slice(i, i + bucketSize));
    }

    const results = [];
    let totalTimeToAdd = 0;
    let totalAffineTime = 0;
    for (let i = 0; i < buckets.length; i++) {
        let result = fieldMath.customEdwards.ExtendedPoint.ZERO;
        const cpuAddStart = performance.now();
        for (let j = 0; j < buckets[i].length; j++) {
            result = result.add(buckets[i][j])
        }
        const cpuAddEnd = performance.now();
        totalTimeToAdd += cpuAddEnd - cpuAddStart;
        const affineStart = performance.now();
        const affinePoint = result.toAffine();
        const affineEnd = performance.now();
        totalAffineTime += affineEnd - affineStart;
        results.push(affinePoint);
    }
    console.log(`Total time to add points on CPU: `, totalTimeToAdd);
    console.log(`Total time to convert points to affine on CPU: `, totalAffineTime);

    console.log(results);
    return new Uint32Array();
}

export const addManyPointsBenchmark = async (points: ExtPointType[], fieldMath: FieldMath) => {
    let result = fieldMath.customEdwards.ExtendedPoint.ZERO;
    for (let i = 0; i < points.length; i++) {
        result = result.add(points[i]);
    }
    
    const affinePoint = result.toAffine();
    const u32XCoord = bigIntToU32Array(affinePoint.x);
    return u32XCoord;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).addManyPointsBenchmark = addManyPointsBenchmark;
(window as any).addManyPointsBenchmarkV2 = addManyPointsBenchmarkV2;
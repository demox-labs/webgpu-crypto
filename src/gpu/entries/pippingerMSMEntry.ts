import { CurveWGSL } from "../Curve";
import { FieldAddWGSL } from "../FieldAdd";
import { FieldDoubleWGSL } from "../FieldDouble";
import { FieldInverseWGSL } from "../FieldInverse";
import { FieldModulusWGSL } from "../FieldModulus";
import { FieldSubWGSL } from "../FieldSub";
import { entry } from "./entryCreator"

import { ExtPointType } from "@noble/curves/abstract/edwards";
import { FieldMath } from "../../utils/FieldMath";
import { bigIntToU32Array, bigIntsToU32Array, u32ArrayToBigInts } from "../utils";

/// Pippinger Algorithm Summary:
/// 1) Break down each 256bit scalar k into 256/c, c bit scalars 
///    ** Note: c = 16 seems to be optimal per (TODO: LINK SOURCE HERE)
///
/// 2) Set up c different MSMs T_1, T_2, ..., T_c where
///    T_1 = a_1_1(P_1) + a_2_1(P_2) + ... + a_n_1(P_n)
///    T_2 = a_1_2(P_1) + a_2_2(P_2) + ... + a_n_2(P_n)
///     .
///     .
///     .
///    T_c = a_1_c(P_1) + a_2_c(P_2) + ... + a_n_c(P_n)
///
/// 3) Use Bucket Method to efficiently compute each MSM
///    * Create 2^c - 1 buckets where each bucket represents a c-bit scalar
///    * In each bucket, keep a running sum of all the points that are mutliplied 
///      by the corresponding scalar
///    * T_i = 1(SUM(Points)) + 2(SUM(Points)) + ... + (2^c - 1)(SUM(Points))
///
/// 4) Once the result of each T_i is calculated, can compute the original
///    MSM with the following formula:
///    T = (2^0)(T1) + (2^(c*1))(T2) + (2^(c*2))(T3) + ... + (2^(c*(c-1)))(T_c)

// Creates a map of 2**16 - 1 keys with the Zero point initialized for each value
const initializeBucket = (fieldMath: FieldMath, c: number): Map<number, ExtPointType> => {
    const T = new Map();
    for (let i = 0; i < Math.pow(2, c); i++) {
        T.set(i, fieldMath.customEdwards.ExtendedPoint.ZERO);
    }
    return T;
}

function chunkArray<T>(inputArray: T[], chunkSize = 20000): T[][] {
    let index = 0;
    const arrayLength = inputArray.length;
    const tempArray = [];
    
    while (index < arrayLength) {
        tempArray.push(inputArray.slice(index, index + chunkSize));
        index += chunkSize;
    }
    
    return tempArray;
}

export const pippinger_msm = async (points: ExtPointType[], scalars: number[], fieldMath: FieldMath) => {
    const C = 16;

    // Need to setup our 16 MSM (T_1, T_2, ..., T_16). We'll do this
    // by via the bucket method for each MSM
    let start = performance.now();
    const msms = [];
    for (let i = 0; i < C; i++) {
        msms.push(initializeBucket(fieldMath, C));
    }
    let end = performance.now();
    console.log(`Time taken to create 16 Maps: ${end - start} milliseconds`);

    start = performance.now();
    let scalarIndex = 0;
    let pointsIndex = 0;
    while (pointsIndex < points.length) {
        
        const scalar = scalars[scalarIndex];
        const pointToAdd = points[pointsIndex];

        const msmIndex = scalarIndex % C;
        
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const currentPoint = msms[msmIndex].get(scalar)!;
        msms[msmIndex].set(scalar, currentPoint.add(pointToAdd));
        
        scalarIndex += 1;
        if (scalarIndex % C == 0) {
            pointsIndex += 1;
        }
    }
    end = performance.now();
    console.log(`Time taken to apply bucket method: ${end - start} milliseconds`);

    start = performance.now();
    const results = [];
    for (let i = 0; i < msms.length; i++) {
        const startLoop = performance.now();
        const flattenedPoints = Array.from(msms[i].values()).map((x) => [x.ex, x.ey, x.et, x.ez]).flat();

        const chunkedPoints = chunkArray(flattenedPoints, 20000);
        const chunkedScalars = chunkArray(Array.from(msms[0].keys()), 5000);

        const bigIntResult = [];

        for (let i = 0; i < chunkedPoints.length; i++) {
            const bufferResult = await point_mul(Array.from(bigIntsToU32Array(chunkedPoints[i])), chunkedScalars[i]);
            bigIntResult.push(...u32ArrayToBigInts(bufferResult || new Uint32Array(0)));
        }

        const pointArray: ExtPointType[] = [];

        // convert big int result to extended points
        for (let i = 0; i < bigIntResult.length; i += 4) {
            const x = bigIntResult[i];
            const y = bigIntResult[i + 1];
            const t = bigIntResult[i + 2];
            const z = bigIntResult[i + 3];
            const point = fieldMath.createPoint(x, y, t, z);
            pointArray.push(point);
        }
        
        results.push(pointArray.reduce((acc, point) => {return acc.add(point)}, fieldMath.customEdwards.ExtendedPoint.ZERO));
        const endLoop = performance.now();
        console.log(`Time taken to solve individual MSM (T_i): ${endLoop - startLoop} milliseconds`);
    }
    end = performance.now();
    console.log(`Time taken to solve all 16 MSMs: ${end - start} milliseconds`);

    start = performance.now();
    let anotherResult = results[0];
    for (let i = 1; i < results.length; i++) {
        anotherResult = anotherResult.multiplyUnsafe(BigInt(Math.pow(2, C)));
        anotherResult = anotherResult.add(results[i]);
    }
    end = performance.now();
    console.log(`Time taken to solve for original MSM: ${end - start} milliseconds`);

    start = performance.now();
    const affineResult = anotherResult.toAffine();
    const u32XCoord = bigIntToU32Array(affineResult.x);
    end = performance.now();
    console.log(`Time taken to prepare and return result: ${end - start} milliseconds`);
    return u32XCoord;
}

export const point_mul = async (input1: Array<number>, input2: Array<number>) => {
    const shaderEntry = `
      @group(0) @binding(0)
      var<storage, read> input1: array<Point>;
      @group(0) @binding(1)
      var<storage, read> input2: array<u32>;
      @group(0) @binding(2)
      var<storage, read_write> output: array<Point>;
  
      @compute @workgroup_size(64)
      fn main(
        @builtin(global_invocation_id)
        global_id : vec3<u32>
      ) {
        var extended_point = input1[global_id.x];
        var scalar = input2[global_id.x];
  
        var result = mul_point_32_bit_scalar(extended_point, scalar);
  
        output[global_id.x] = result;
      }
      `;
  
    const shaderModules = [FieldModulusWGSL, FieldAddWGSL, FieldSubWGSL, FieldDoubleWGSL, FieldInverseWGSL, CurveWGSL, shaderEntry];
  
    return await entry([input1, input2], shaderModules, 32, 32);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).pippinger_msm = pippinger_msm;
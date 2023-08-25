import { CurveWGSL } from "../wgsl/Curve";
import { FieldModulusWGSL } from "../wgsl/FieldModulus";
import { entry } from "./entryCreator"
import { ExtPointType } from "@noble/curves/abstract/edwards";
import { FieldMath } from "../../utils/BLS12_377FieldMath";
import { bigIntToU32Array, bigIntsToU32Array, gpuU32Inputs, u32ArrayToBigInts } from "../utils";
import { BLS12_377ParamsWGSL } from "../wgsl/BLS12-377Params";
import { U256WGSL } from "../wgsl/U256";
import { EXT_POINT_SIZE, FIELD_SIZE } from "../U32Sizes";

/// Pippinger Algorithm Summary:
/// 
/// Great explanation of algorithm can be found here:
/// https://www.youtube.com/watch?v=Bl5mQA7UL2I
///
/// 1) Break down each 256bit scalar k into 256/c, c bit scalars 
///    ** Note: c = 16 seems to be optimal per source mentioned above
///
/// 2) Set up 256/c different MSMs T_1, T_2, ..., T_c where
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
///    MSM (T) with the following formula:
///    T <- T_1
///    for j = 2,...,256/c:
///        T <- (2^c) * T
///        T <- T + T_j

// Creates a map of 2**16 - 1 keys with the Zero point initialized for each value
const initializeMsmMap = (fieldMath: FieldMath, c: number): Map<number, ExtPointType> => {
    const T = new Map();
    for (let i = 0; i < Math.pow(2, c); i++) {
        T.set(i, fieldMath.customEdwards.ExtendedPoint.ZERO);
    }
    return T;
}

// Breaks up an array into separate arrays of size chunkSize
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

    ///
    /// DICTIONARY SETUP
    ///
    // Need to setup our 256/C MSMs (T_1, T_2, ..., T_n). We'll do this
    // by via the bucket method for each MSM
    let start = performance.now();
    const numMsms = 256/C;
    const msms = [];
    for (let i = 0; i < numMsms; i++) {
        msms.push(initializeMsmMap(fieldMath, C));
    }
    let end = performance.now();
    console.log(`Time taken to create 16 Maps: ${end - start} milliseconds`);

    ///
    /// BUCKET METHOD
    ///
    start = performance.now();
    let scalarIndex = 0;
    let pointsIndex = 0;
    while (pointsIndex < points.length) {
        
        const scalar = scalars[scalarIndex];
        const pointToAdd = points[pointsIndex];

        const msmIndex = scalarIndex % msms.length;
        
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const currentPoint = msms[msmIndex].get(scalar)!;
        msms[msmIndex].set(scalar, currentPoint.add(pointToAdd));
        
        scalarIndex += 1;
        if (scalarIndex % msms.length == 0) {
            pointsIndex += 1;
        }
    }
    end = performance.now();
    console.log(`Time taken to apply bucket method: ${end - start} milliseconds`);

    ///
    /// GPU INPUT SETUP & COMPUTATION
    ///
    start = performance.now();
    const pointsConcatenated: bigint[] = [];
    const scalarsConcatenated: number[] = [];
    for (let i = 0; i < msms.length; i++) {
        Array.from(msms[i].values()).map((x) => { 
            const expandedPoint = [x.ex, x.ey, x.et, x.ez];
            pointsConcatenated.push(...expandedPoint);
        });
        scalarsConcatenated.push(...Array.from(msms[i].keys()))
    }
    end = performance.now();
    console.log(`Time taken to prep scalars and points for GPU inputs: ${end - start} milliseconds`);

    start = performance.now();
    // Need to consider GPU buffer and memory limits so need to chunk
    // the concatenated inputs into reasonable sizes. The ratio of points
    // to scalars is 4:1 since we expanded the point object into its
    // x, y, t, z coordinates. 
    const chunkedPoints = chunkArray(pointsConcatenated, 44000);
    const chunkedScalars = chunkArray(scalarsConcatenated, 11000);

    const gpuResultsAsBigInts = [];
    const avgGpuChunkCalculationTimes = [];
    const avgU32ToBigIntConversionTime = [];
    let pointMulCallTimes = 0
    for (let i = 0; i < chunkedPoints.length; i++) {
        const chunkCalculationStart = performance.now();
        const bufferResult = await point_mul({ u32Inputs: bigIntsToU32Array(chunkedPoints[i]), individualInputSize: EXT_POINT_SIZE }, { u32Inputs: Uint32Array.from(chunkedScalars[i]), individualInputSize: FIELD_SIZE });
        pointMulCallTimes += 1;
        const chunkCalculationEnd = performance.now();
        avgGpuChunkCalculationTimes.push(chunkCalculationEnd - chunkCalculationStart);
        
        const u32Start = performance.now();
        gpuResultsAsBigInts.push(...u32ArrayToBigInts(bufferResult || new Uint32Array(0)));
        const u32End = performance.now();
        avgU32ToBigIntConversionTime.push(u32End - u32Start);
    }
    end = performance.now();
    console.log(`Total number of times point_mul was called: ${pointMulCallTimes}`);
    console.log(`AVG time taken per each chunk: 
        ${avgGpuChunkCalculationTimes.reduce((acc, curr) => acc + curr, 0) / avgGpuChunkCalculationTimes.length} milliseconds`);
    console.log(`AVG time taken to convert the u32s back to bigInts: 
        ${avgU32ToBigIntConversionTime.reduce((acc, curr) => acc + curr, 0) / avgU32ToBigIntConversionTime.length} milliseconds`);
    console.log(`Total time taken for GPU calculations to finish: ${end - start} milliseconds`);

    ///
    /// CONVERT GPU RESULTS BACK TO EXTENDED POINTS
    ///
    const gpuResultsAsExtendedPoints: ExtPointType[] = [];
    start = performance.now();
    for (let i = 0; i < gpuResultsAsBigInts.length; i += 4) {
        const x = gpuResultsAsBigInts[i];
        const y = gpuResultsAsBigInts[i + 1];
        const t = gpuResultsAsBigInts[i + 2];
        const z = gpuResultsAsBigInts[i + 3];
        const extendedPoint = fieldMath.createPoint(x, y, t, z);
        gpuResultsAsExtendedPoints.push(extendedPoint);
    }
    end = performance.now();
    console.log(`Time taken to convert GPU results back to Extended Point Types: ${end - start} milliseconds`);

    ///
    /// SUMMATION OF SCALAR MULTIPLICATIONS FOR EACH MSM
    ///
    start = performance.now();
    const msmResults = [];
    let currentSum = fieldMath.customEdwards.ExtendedPoint.ZERO;
    for (let i = 0; i < gpuResultsAsExtendedPoints.length; i++) {
        currentSum = currentSum.add(gpuResultsAsExtendedPoints[i]);

        if (i % 65536 === 0 && i !== 0) {
            msmResults.push(currentSum);
            currentSum = fieldMath.customEdwards.ExtendedPoint.ZERO;
        }
    }
    
    msmResults.push(currentSum);
    end = performance.now();
    console.log(`Time taken to sum up individual MSMs: ${end - start} milliseconds`);

    ///
    /// SOLVE FOR ORIGINAL MSM
    ///
    start = performance.now();
    let originalMsmResult = msmResults[0];
    for (let i = 1; i < msmResults.length; i++) {
        originalMsmResult = originalMsmResult.multiplyUnsafe(BigInt(Math.pow(2, C)));
        originalMsmResult = originalMsmResult.add(msmResults[i]);
    }
    end = performance.now();
    console.log(`Time taken to solve for original MSM: ${end - start} milliseconds`);

    ///
    /// CONVERT TO AFFINE POINT FOR FINAL RESULT
    ///
    start = performance.now();
    const affineResult = originalMsmResult.toAffine();
    const u32XCoord = bigIntToU32Array(affineResult.x);
    end = performance.now();
    console.log(`Time taken to prepare and return result: ${end - start} milliseconds`);
    return u32XCoord;
}

const point_mul = async (
    input1: gpuU32Inputs,
    input2: gpuU32Inputs
    ) => {
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
  
    const shaderModules = [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL, CurveWGSL, shaderEntry];
  
    return await entry([input1, input2], shaderModules, EXT_POINT_SIZE);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).pippinger_msm = pippinger_msm;
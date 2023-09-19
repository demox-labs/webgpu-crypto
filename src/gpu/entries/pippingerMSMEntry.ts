import { CurveWGSL } from "../wgsl/Curve";
import { FieldModulusWGSL } from "../wgsl/FieldModulus";
import { BLS12_377CurveBaseWGSL } from "../wgsl/BLS12-377CurveBaseWGSL";
import { BLS12_377ParamsWGSL } from "../wgsl/BLS12-377Params";
import { entry } from "./entryCreator"
import { ExtPointType } from "@noble/curves/abstract/edwards";
import { CurveType } from '../curveSpecific';
import { FieldMath } from "../../utils/BLS12_377FieldMath";
import { bigIntToU32Array, bigIntsToU32Array, gpuU32Inputs, u32ArrayToBigInts } from "../utils";
import { U256WGSL } from "../wgsl/U256";
import { EXT_POINT_SIZE, FIELD_SIZE } from "../U32Sizes";
import { prune } from "../prune";

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

export const pippinger_msm = async (
  curve: CurveType,
  points: ExtPointType[],
  scalars: number[], 
  fieldMath: FieldMath
  ): Promise<Uint32Array> => {
    const C = 16;

    ///
    /// DICTIONARY SETUP
    ///
    // Need to setup our 256/C MSMs (T_1, T_2, ..., T_n). We'll do this
    // by via the bucket method for each MSM
    const numMsms = 256/C;
    const msms: Map<number, ExtPointType>[] = [];
    for (let i = 0; i < numMsms; i++) {
        msms.push(new Map<number, ExtPointType>());
    }

    ///
    /// BUCKET METHOD
    ///
    let scalarIndex = 0;
    let pointsIndex = 0;
    while (pointsIndex < points.length) {
        
        const scalar = scalars[scalarIndex];
        const pointToAdd = points[pointsIndex];

        const msmIndex = scalarIndex % msms.length;
        
        const currentPoint = msms[msmIndex].get(scalar);
        if (currentPoint === undefined) {
          msms[msmIndex].set(scalar, pointToAdd);
        } else {
          msms[msmIndex].set(scalar, currentPoint.add(pointToAdd));
        }
        
        scalarIndex += 1;
        if (scalarIndex % msms.length == 0) {
            pointsIndex += 1;
        }
    }

    ///
    /// GPU INPUT SETUP & COMPUTATION
    ///
    const pointsConcatenated: bigint[] = [];
    const scalarsConcatenated: number[] = [];
    for (let i = 0; i < msms.length; i++) {
        Array.from(msms[i].values()).map((x) => { 
            const expandedPoint = [x.ex, x.ey, x.et, x.ez];
            pointsConcatenated.push(...expandedPoint);
        });
        scalarsConcatenated.push(...Array.from(msms[i].keys()))
    }

    // Need to consider GPU buffer and memory limits so need to chunk
    // the concatenated inputs into reasonable sizes. The ratio of points
    // to scalars is 4:1 since we expanded the point object into its
    // x, y, t, z coordinates. 
    const chunkedPoints = chunkArray(pointsConcatenated, 44_000);
    const chunkedScalars = chunkArray(scalarsConcatenated, 11_000);

    const gpuResultsAsBigInts = [];
    for (let i = 0; i < chunkedPoints.length; i++) {
        const bufferResult = await point_mul(
          { u32Inputs: bigIntsToU32Array(chunkedPoints[i]), individualInputSize: EXT_POINT_SIZE }, 
          { u32Inputs: Uint32Array.from(chunkedScalars[i]), individualInputSize: FIELD_SIZE }
        );
        
        gpuResultsAsBigInts.push(...u32ArrayToBigInts(bufferResult || new Uint32Array(0)));
    }

    ///
    /// CONVERT GPU RESULTS BACK TO EXTENDED POINTS
    ///
    const gpuResultsAsExtendedPoints: ExtPointType[] = [];
    for (let i = 0; i < gpuResultsAsBigInts.length; i += 4) {
        const x = gpuResultsAsBigInts[i];
        const y = gpuResultsAsBigInts[i + 1];
        const t = gpuResultsAsBigInts[i + 2];
        const z = gpuResultsAsBigInts[i + 3];
        const extendedPoint = fieldMath.createPoint(x, y, t, z);
        gpuResultsAsExtendedPoints.push(extendedPoint);
    }

    ///
    /// SUMMATION OF SCALAR MULTIPLICATIONS FOR EACH MSM
    ///
    const msmResults = [];
    const bucketing = msms.map(msm => msm.size);
    let prevBucketSum = 0;
    for (const bucket of bucketing) {
      let currentSum = fieldMath.customEdwards.ExtendedPoint.ZERO;
      for (let i = 0; i < bucket; i++) {
        currentSum = currentSum.add(gpuResultsAsExtendedPoints[i + prevBucketSum]);
      }
      msmResults.push(currentSum);
      prevBucketSum += bucket;
    }

    ///
    /// SOLVE FOR ORIGINAL MSM
    ///
    let originalMsmResult = msmResults[0];
    for (let i = 1; i < msmResults.length; i++) {
        originalMsmResult = originalMsmResult.multiplyUnsafe(BigInt(Math.pow(2, C)));
        originalMsmResult = originalMsmResult.add(msmResults[i]);
    }

    ///
    /// CONVERT TO AFFINE POINT FOR FINAL RESULT
    ///
    const affineResult = originalMsmResult.toAffine();
    const u32XCoord = bigIntToU32Array(affineResult.x);
    
    return u32XCoord;
    // return { x: affineResult.x, y: affineResult.y };
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
  
    const shaderCode = prune(
      [U256WGSL, FieldModulusWGSL, CurveWGSL, BLS12_377CurveBaseWGSL, BLS12_377ParamsWGSL].join(''),
      ['mul_point_32_bit_scalar']
    );
  
    return await entry([input1, input2], shaderCode + shaderEntry, EXT_POINT_SIZE);
}
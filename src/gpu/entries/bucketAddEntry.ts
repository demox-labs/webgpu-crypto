import { ExtPointType } from "@noble/curves/abstract/edwards";
import { CurveWGSL } from "../Curve";
import { FieldAddWGSL } from "../FieldAdd";
import { FieldDoubleWGSL } from "../FieldDouble";
import { FieldInverseWGSL } from "../FieldInverse";
import { FieldModulusWGSL } from "../FieldModulus";
import { FieldSubWGSL } from "../FieldSub";
import { tempEntry } from "./tempEntryCreator";
import { FieldMath } from "../../utils/FieldMath";
import { bigIntToU32Array, bigIntsToU32Array, u32ArrayToBigInts } from "../utils";

function initializeMsmMaps(C: number) {
    const start = performance.now();
    const msms = [];
    for (let i = 0; i < C; i++) {
        msms.push(initializeBucketNew(C));
    }
    const end = performance.now();
    console.log(`Time taken to create 16 Maps: ${end - start} milliseconds`);
    return msms;
}

const initializeBucketNew = (c: number): Map<number, ExtPointType[]> => {
    const T = new Map();
    for (let i = 0; i < Math.pow(2, c); i++) {
        const pointsArray: ExtPointType[] = [];
        T.set(i, pointsArray);
    }
    return T;
}

function sortPointsIntoBuckets(points: ExtPointType[], scalars: number[], msms: Map<number, ExtPointType[]>[], arraySize: number) {
    const start = performance.now();
    let scalarIndex = 0;
    let pointsIndex = 0;
    while (pointsIndex < points.length) {
        const scalar = scalars[scalarIndex];
        let pointToAdd = points[pointsIndex];
        const msmIndex = scalarIndex % 16;

        const pointsList = msms[msmIndex].get(scalar)!;
        // If the list of points for a given bucket is less than the constant we set,
        // then we just want to add the point to the list
        if (pointsList.length < arraySize) {
            pointsList.push(pointToAdd);
        } 
        // Once the list grows to be more than the constant size we set, then we just
        // add the current point to the last point in the list and set the last point
        // in the list to the result (CPU computation)
        else {
            const lastPoint = pointsList[pointsList.length - 1];
            pointToAdd = lastPoint.add(pointToAdd);
            pointsList[pointsList.length - 1] = pointToAdd;
        }
        msms[msmIndex].set(scalar, pointsList);
        
        scalarIndex += 1;
        if (scalarIndex % 16 == 0) {
            pointsIndex += 1;
        }
    }
    const end = performance.now();
    console.log(`Time taken to place points in buckets: ${end - start} milliseconds`);
    return msms;
}

function flattenMsmPoints(msms: Map<number, ExtPointType[]>[], arraySize: number, fieldMath: FieldMath) {
    const flattenedPoints: bigint[]= [];
    const start = performance.now();
    // Now, unfortunately, we have to fill arrays that aren't full with the zero point
    for (let i = 0; i < msms.length; i++) {
        const map = msms[i];
        const mapKeys = Array.from(map.keys());
        for (let j = 0; j < mapKeys.length; j++) {
            const pointsList = map.get(j)!;
            while (pointsList.length < arraySize) {
                pointsList.push(fieldMath.customEdwards.ExtendedPoint.ZERO);
            }
            //map.set(j, pointsList);
            pointsList.map((x) => {
                const expanded = [x.ex, x.ey, x.et, x.ez]
                flattenedPoints.push(...expanded);
            });
        }
    }
    const end = performance.now();
    console.log(`Time taken to further prep points in buckets: ${end - start} milliseconds`);
    return flattenedPoints;
}

function chunkArray<T>(inputArray: T[], numBuckets: number, bucketSize: number): T[][] {
    const start = performance.now();
    let index = 0;
    const arrayLength = inputArray.length;
    const tempArray = [];
    
    while (index < arrayLength) {
        tempArray.push(inputArray.slice(index, index + numBuckets*bucketSize));
        index += numBuckets*bucketSize;
    }
    const end = performance.now();
    console.log(`Time taken to chunk points = ${end - start} milliseconds`);
    
    return tempArray;
} 

export const bucket_add = async (points: ExtPointType[], scalars: number[], fieldMath: FieldMath) => {
    const C = 16;
    const arraySize = 16;

    ///
    /// DICTIONARY SETUP
    ///
    // Need to setup our 16 MSM (T_1, T_2, ..., T_16). We'll do this
    // by via the bucket method for each MSM
    let msms = initializeMsmMaps(C);

    ///
    /// BUCKET METHOD
    ///
    msms = sortPointsIntoBuckets(points, scalars, msms, arraySize);

    // Flatten MSM points
    const flattenedPointLists = flattenMsmPoints(msms, arraySize, fieldMath);

    // Chunk Points
    const chunkedPoints = chunkArray(flattenedPointLists, 65536, 4*arraySize);
    
    const bigIntResults = [];
    for (let i = 0; i < chunkedPoints.length; i++) {
        const startGpu = performance.now();
        const bufferResult = await addPointLists(bigIntsToU32Array(chunkedPoints[i]), arraySize);
        const endGpu = performance.now();
        console.log(`Time taken to add points in chunk number ${i}: ${endGpu - startGpu} milliseconds`);
        
        bigIntResults.push(u32ArrayToBigInts(bufferResult || new Uint32Array(0)));
    }
    console.log(bigIntResults);
    const extPoint = fieldMath.createPoint(bigIntResults[0][0], bigIntResults[0][1], bigIntResults[0][2], bigIntResults[0][3]);
    console.log(extPoint.toAffine());

    return new Uint32Array();
}

export const addPointLists = async (pointLists: Uint32Array, arraySize: number) => {
    const shaderEntry = `
      @group(0) @binding(0)
      var<storage, read> pointLists: array<array<Point, ${arraySize}>>;
      @group(0) @binding(1)
      var<storage, read_write> output: array<Point>;
  
      @compute @workgroup_size(64)
      fn main(
        @builtin(global_invocation_id)
        global_id : vec3<u32>
      ) {
        var pointList = pointLists[global_id.x];
        var result = ZERO_POINT;

        for (var i = 0u; i < ${arraySize}u; i = i + 1u) {
            result = add_points(result, pointList[i]);
        }
  
        output[global_id.x] = result;
      }
      `;
  
    const shaderModules = [FieldModulusWGSL, FieldAddWGSL, FieldSubWGSL, FieldDoubleWGSL, FieldInverseWGSL, CurveWGSL, shaderEntry];
  
    return new Uint32Array(0);
    // return await tempEntry(pointLists, shaderModules, arraySize*32, 32);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_add = bucket_add;
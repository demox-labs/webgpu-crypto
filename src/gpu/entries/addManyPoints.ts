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

function chunkArray<T>(inputArray: T[], numBuckets: number, bucketSize: number): T[][] {
    let index = 0;
    const arrayLength = inputArray.length;
    const tempArray = [];
    
    while (index < arrayLength) {
        tempArray.push(inputArray.slice(index, index + numBuckets*bucketSize));
        index += numBuckets*bucketSize;
    }
    
    return tempArray;
} 

export const addManyPointsSmall = async(points: ExtPointType[], fieldMath: FieldMath) => {
    const flattenedPoints: bigint[] = [];
    points.map((x) => {
        const expanded = [x.ex, x.ey, x.et, x.ez]
        flattenedPoints.push(...expanded);
    });

    const bufferResult = await addPointLists(bigIntsToU32Array(flattenedPoints), 100);
    const bigIntsResult = u32ArrayToBigInts(bufferResult);
    const extPoint = fieldMath.createPoint(bigIntsResult[0], bigIntsResult[1], bigIntsResult[2], bigIntsResult[3]);
    return bigIntToU32Array(extPoint.toAffine().x);
}

export const addManyPointsMedium = async(points: ExtPointType[], fieldMath: FieldMath) => {
    const bucketSize = 20;
    const numberOfBuckets = Math.ceil(points.length / bucketSize);

    // Flatten the array and extend with zeros
    const flattened = points.concat(new Array(bucketSize * numberOfBuckets - points.length).fill(fieldMath.customEdwards.ExtendedPoint.ZERO));
    const flattenedPoints: bigint[] = [];
    flattened.map((x) => {
        const expanded = [x.ex, x.ey, x.et, x.ez]
        flattenedPoints.push(...expanded);
    });

    const bufferResult = await addPointLists(bigIntsToU32Array(flattenedPoints), bucketSize);
    const bigIntResult = u32ArrayToBigInts(bufferResult);
    const affinePointArray = [];
    for (let i = 0; i < bigIntResult.length; i += 4) {
        const x = bigIntResult[i];
        const y = bigIntResult[i + 1];
        const t = bigIntResult[i + 2];
        const z = bigIntResult[i + 3];
        const point = fieldMath.createPoint(x, y, t, z);
        affinePointArray.push(point.toAffine());
      }
    console.log(affinePointArray);
    return new Uint32Array();
}

export const addManyPointsLarge = async(points: ExtPointType[], fieldMath: FieldMath) => {
    const bucketSize = 16;
    const numberOfBuckets = Math.ceil(points.length / bucketSize);

    // Flatten the array and extend with zeros
    const flattened = points.concat(new Array(bucketSize * numberOfBuckets - points.length).fill(fieldMath.customEdwards.ExtendedPoint.ZERO));
    const flattenedPoints: bigint[] = [];
    flattened.map((x) => {
        const expanded = [x.ex, x.ey, x.et, x.ez]
        flattenedPoints.push(...expanded);
    });

    const chunkedPoints = chunkArray(flattenedPoints, numberOfBuckets/5, bucketSize);
    const bigIntResults = [];
    for (let i = 0; i < chunkedPoints.length; i++) {
        const start = performance.now();
        const bufferResult = await addPointLists(bigIntsToU32Array(chunkedPoints[i]), bucketSize);
        const end = performance.now();
        console.log(`Time taken to add points in chunk number ${i}: ${end - start} milliseconds`);
        bigIntResults.push(u32ArrayToBigInts(bufferResult));
    }

    const affinePointResults = [];
    for (let i = 0; i < bigIntResults.length; i++) {
        const resultArray = bigIntResults[i];
        for (let j = 0; j < resultArray.length; j+=4) {
            const x = resultArray[i];
            const y = resultArray[i + 1];
            const t = resultArray[i + 2];
            const z = resultArray[i + 3];
            const point = fieldMath.createPoint(x, y, t, z);
            affinePointResults.push(point.toAffine());
        }
    }

    console.log(affinePointResults);
    return new Uint32Array();
}

export const addManyPoints = async (points: ExtPointType[], fieldMath: FieldMath) => {
    const arraySize = 16; 

    const flattenedPoints: bigint[] = [];
    points.map((x) => {
        const expanded = [x.ex, x.ey, x.et, x.ez]
        flattenedPoints.push(...expanded);
    });
    
    const bigIntResults = [];
    const chunkedList = chunkArray(flattenedPoints, 65536, 4*arraySize);
    for (let i = 0; i < chunkedList.length; i++) {
        // Get Result from GPU
        const startGpu = performance.now();
        const bufferResult = await addPointLists(bigIntsToU32Array(chunkedList[i]), arraySize);
        const endGpu = performance.now();
        console.log(`Time taken to add points in chunk number ${i}: ${endGpu - startGpu} milliseconds`);
        bigIntResults.push(u32ArrayToBigInts(bufferResult || new Uint32Array(0)));
    }
    console.log(console.log(bigIntResults));

    return new Uint32Array();
}

export const addPointLists = async (input1: Uint32Array, arrSize: number) => {
    const numBuckets = 16;
    const shaderEntry = `
      @group(0) @binding(0)
      var<storage, read> input1: array<array<Point, ${arrSize}>>;
      @group(0) @binding(1)
      var<storage, read_write> output: array<Point>; // Instantiate to array zero points of size numBuckets

      @compute @workgroup_size(${numBuckets}, ${arrSize})
      fn main(
        @builtin(global_invocation_id) global_id : vec3<u32>
      ) {
        var points = input1[global_id.x];

        output[global_id.x] = add_points(points[global_id.y], output[global_id.x]);
      }
      `;

    // const shaderEntry = `
    //   @group(0) @binding(0)
    //   var<storage, read> input1: array<array<Point, ${arraySize}>>;
    //   @group(0) @binding(1)
    //   var<storage, read_write> output: array<Point>;
  
    //   @compute @workgroup_size(64)
    //   fn main(
    //     @builtin(global_invocation_id)
    //     global_id : vec3<u32>
    //   ) {
    //     var points = input1[global_id.x];
    //     var result = ZERO_POINT;

    //     for (var i = 0u; i < ${arraySize}u; i = i + 1u) {
    //         result = add_points(result, points[i]);
    //     }
  
    //     output[global_id.x] = result;
    //   }
    //   `;

    // const shaderEntry = `
    // @group(0) @binding(0)
    // var<storage, read> input1: array<array<Point, ${arraySize}>>;
    // @group(0) @binding(1)
    // var<storage, read_write> output: array<Point>;

    // @compute @workgroup_size(64)
    // fn main(
    //     @builtin(global_invocation_id)
    //     global_id : vec3<u32>
    // ) {
    //     var results_points = input1[global_id.x];

    //     // Number of active elements
    //     var count = ${arraySize}u;
        
    //     // Iterate until we reduce the list to a single result
    //     while(count > 1u) {
    //         // For every 2 elements, add them and store in the left element
    //         for (var i = 0u; i < count; i = i + 2u) {
    //             if (i + 1u < count) {
    //                 results_points[i] = add_points(results_points[i], results_points[i + 1u]);
    //             }
    //         }

    //         // Halve the count for next iteration
    //         count = (count + 1u) / 2u;
    //     }

    //     output[global_id.x] = results_points[0];
    // }
    // `;
  
    const shaderModules = [FieldModulusWGSL, FieldAddWGSL, FieldSubWGSL, FieldDoubleWGSL, FieldInverseWGSL, CurveWGSL, shaderEntry];
  
    return await tempEntry(input1, shaderModules, arrSize*32, 32);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).addManyPoints = addManyPoints;
(window as any).addManyPointsSmall = addManyPointsSmall;
(window as any).addManyPointsMedium = addManyPointsMedium;
(window as any).addManyPointsLarge = addManyPointsLarge;
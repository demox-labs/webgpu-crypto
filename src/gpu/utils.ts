import { FIELD_MODULUS as BLS12_377_MODULUS } from "../params/BLS12_377Constants";
import { FQ_FIELD_MODULUS as BN254_MODULUS, FR_FIELD_MODULUS } from "../params/BN254Constants";
import { CurveType } from "./curveSpecific";

export const bigIntsToU16Array = (beBigInts: bigint[]): Uint16Array => {
  const intsAs16s = beBigInts.map(bigInt => bigIntToU16Array(bigInt));
  const u16Array = new Uint16Array(beBigInts.length * 16);
  intsAs16s.forEach((intAs16, index) => {u16Array.set(intAs16, index * 16)});
  return u16Array;
}

export const bigIntToU16Array = (beBigInt: bigint): Uint16Array => {
  const numBits = 256;
  const bitsPerElement = 16;
  const numElements = numBits / bitsPerElement;
  const u16Array = new Uint16Array(numElements);
  const mask = (BigInt(1) << BigInt(bitsPerElement)) - BigInt(1); // Create a mask for the lower 32 bits

  let tempBigInt = beBigInt;
  for (let i = numElements - 1; i >= 0; i--) {
    u16Array[i] = Number(tempBigInt & mask); // Extract the lower 32 bits
    tempBigInt >>= BigInt(bitsPerElement); // Right-shift the remaining bits
  }

  return u16Array;
};

// assume bigints are big endian 256-bit integers
export const bigIntsToU32Array = (beBigInts: bigint[]): Uint32Array => {
  const intsAs32s = beBigInts.map(bigInt => bigIntToU32Array(bigInt));
  const u32Array = new Uint32Array(beBigInts.length * 8);
  intsAs32s.forEach((intAs32, index) => {u32Array.set(intAs32, index * 8)});
  return u32Array;
};

export const bigIntToU32Array = (beBigInt: bigint): Uint32Array => {
  const numBits = 256;
  const bitsPerElement = 32;
  const numElements = numBits / bitsPerElement;
  const u32Array = new Uint32Array(numElements);
  const mask = (BigInt(1) << BigInt(bitsPerElement)) - BigInt(1); // Create a mask for the lower 32 bits

  let tempBigInt = beBigInt;
  for (let i = numElements - 1; i >= 0; i--) {
    u32Array[i] = Number(tempBigInt & mask); // Extract the lower 32 bits
    tempBigInt >>= BigInt(bitsPerElement); // Right-shift the remaining bits
  }

  return u32Array;
};

export const u32ArrayToBigInts = (u32Array: Uint32Array): bigint[] => {
  const bigInts = [];
  for (let i = 0; i < u32Array.length; i += 8) {
    let bigInt = BigInt(0);
    for (let j = 0; j < 8 && (i + j) < u32Array.length; j++) {
      bigInt = (bigInt << BigInt(32)) | BigInt(u32Array[i + j]);
    }
    bigInts.push(bigInt);
  }
  return bigInts;
};

export interface gpuU32Inputs {
  u32Inputs: Uint32Array;
  individualInputSize: number;
}

export const gpuU32PuppeteerString = (gpuU32Input: gpuU32Inputs): string => {
  let puppeteerString = `{ u32Inputs: Uint32Array.from([${gpuU32Input.u32Inputs}])`;
  
  puppeteerString += ', individualInputSize: ' + gpuU32Input.individualInputSize + '}';
  return puppeteerString;
};

export const chunkArray = (inputsArray: gpuU32Inputs[], batchSize: number): gpuU32Inputs[][] => {
  let index = 0;
  const chunkedArray: gpuU32Inputs[][] = [];
  const firstInputLength = inputsArray[0].u32Inputs.length / inputsArray[0].individualInputSize;

  while (index < firstInputLength) {
      const newIndex = index + batchSize;
      const tempArray: gpuU32Inputs[] = [];
      inputsArray.forEach(bufferData => {
        const chunkedGpuU32Inputs = bufferData.u32Inputs.slice(index * bufferData.individualInputSize, newIndex * bufferData.individualInputSize);
        tempArray.push({
          u32Inputs: chunkedGpuU32Inputs,
          individualInputSize: bufferData.individualInputSize
        });
      });
      index = newIndex;
      chunkedArray.push(tempArray);
  }

  return chunkedArray;
};

export const chunkGPUInputs = (inputsArray: gpuU32Inputs[], batchSize: number, inputsToBatch: number[]): gpuU32Inputs[][] => {
  const chunkedArray: gpuU32Inputs[][] = [];
  const numInputs = inputsArray[0].u32Inputs.length / inputsArray[0].individualInputSize;
  
  let numBatched = 0
  while (numBatched < numInputs) {
    const chunkedInputs: gpuU32Inputs[] = [];
    for (let i = 0; i < inputsArray.length; i++) {
      const bufferData = inputsArray[i];
      const shouldBatch = inputsToBatch.length === 0 || inputsToBatch.includes(i);
      if (shouldBatch) {
        const chunkedGpuU32Inputs = bufferData.u32Inputs.slice(numBatched * bufferData.individualInputSize, (numBatched + batchSize) * bufferData.individualInputSize);
        chunkedInputs.push({
          u32Inputs: chunkedGpuU32Inputs,
          individualInputSize: bufferData.individualInputSize
        });
      } else {
        // This isn't an input that we should batch, so we assume that it should be the same every pass
        chunkedInputs.push(bufferData);
      }
    }
    numBatched += batchSize;
    chunkedArray.push(chunkedInputs);
  }

  return chunkedArray;
};

const pushOrCreateArray = (array: any[], index: number, value: any) => {
  if (!array[index]) {
    array[index] = [];
  }
  array[index].push(value);
}

export const generateRandomFields = (inputSize: number, curve: CurveType): bigint[] => {
  const randomBigInts = [];
  let fieldModulus = BigInt(0);
  switch (curve) {
    case CurveType.BN254:
      fieldModulus = BN254_MODULUS;
      break;
    case CurveType.BLS12_377:
      fieldModulus = BLS12_377_MODULUS;
      break;
    default:
      throw new Error('Invalid curve type');
  }
  for (let i = 0; i < inputSize; i++) {
    randomBigInts.push(createRandomNumber(fieldModulus));
  }

  return randomBigInts;
};

export const generateRandomScalars = (inputSize: number, curve: CurveType): bigint[] => {
  const randomBigInts = [];
  let fieldModulus = BigInt(0);
  switch (curve) {
    case CurveType.BN254:
      fieldModulus = FR_FIELD_MODULUS;
      break;
    case CurveType.BLS12_377:
      fieldModulus = BLS12_377_MODULUS;
      break;
    default:
      throw new Error('Invalid curve type');
  }
  for (let i = 0; i < inputSize; i++) {
    randomBigInts.push(createRandomNumber(fieldModulus));
  }

  return randomBigInts;
};

export const convertBigIntsToWasmFields = (bigInts: bigint[]): string[] => {
  return bigInts.map(bigInt => bigInt.toString() + 'field');
};

const createRandomNumber = (modulus: bigint) => {
  let bigIntString = '';
  for (let i = 0; i < 8; i++) {
    bigIntString += Math.floor(Math.random() * (2**32 - 1));
  }
  // const modResult = BigInt(1) % modulus;
  const modResult = BigInt(bigIntString) % modulus;
  return modResult;
}

export const stripFieldSuffix = (field: string): string => {
  return field.slice(0, field.length - 5);
};

export const stripGroupSuffix = (group: string): string => {
  return group.slice(0, group.length - 5);
};
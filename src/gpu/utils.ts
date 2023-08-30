import { FIELD_MODULUS } from "../params/BLS12_377Constants";

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
  const nonZeroBitString = beBigInt.toString(2);
  const paddedZeros = '0'.repeat(numBits - nonZeroBitString.length);
  const bitString = paddedZeros + nonZeroBitString;
  for (let i = 0; i < numElements; i++) {
    const startIndex = i * bitsPerElement;
    const endIndex = startIndex + bitsPerElement;
    const bitStringSlice = bitString.slice(startIndex, endIndex);
    const u32 = parseInt(bitStringSlice, 2);
    u32Array[i] = u32;
  }

  return u32Array;
};

export const u32ArrayToBigInts = (u32Array: Uint32Array): bigint[] => {
  const bigInts = [];
  for (let i = 0; i < u32Array.length; i += 8) {
    const u32s = u32Array.slice(i, i + 8);
    let bigIntString = '';
    for (let j = 0; j < u32s.length; j++) {
      const u32 = u32s[j];
      const u32String = u32.toString(2);
      const paddedZeros = '0'.repeat(32 - u32String.length);
      bigIntString = bigIntString + paddedZeros + u32String;
    }
    const bigInt = BigInt('0b' + bigIntString);
    bigInts.push(bigInt);
  }
  return bigInts;
}

// Not u256 specific
export function bigIntToUint32Array(value: bigint, isBigEndian: boolean): Uint32Array {
  // Calculate the required size of the Uint32Array
  const size = Math.ceil(Number(value.toString(2).length) / 32);
  const result = new Uint32Array(size);

  const loopStart = isBigEndian ? 0 : size - 1;
  const loopEnd = isBigEndian ? size : -1;
  const loopStep = isBigEndian ? 1 : -1;

  let tempValue = value;
  for (let i = loopStart; isBigEndian ? i < loopEnd : i > loopEnd; i += loopStep) {
    result[i] = Number(tempValue & BigInt(0xFFFFFFFF));
    tempValue >>= BigInt(32);
  }

  return result;
}

// Not u256 specific
export function uint32ArrayToBigInt(arr: Uint32Array, isBigEndian: boolean): BigInt {
  let result = BigInt(0);

  const loopStart = isBigEndian ? 0 : arr.length - 1;
  const loopEnd = isBigEndian ? arr.length : -1;
  const loopStep = isBigEndian ? 1 : -1;

  for (let i = loopStart; isBigEndian ? i < loopEnd : i > loopEnd; i += loopStep) {
    result = (result << BigInt(32)) | BigInt(arr[i]);
  }

  return result;
}

export const generateRandomFields = (inputSize: number): bigint[] => {
  const randomBigInts = [];
  for (let i = 0; i < inputSize; i++) {
    randomBigInts.push(createRandomAleoFieldInt());
  }

  return randomBigInts;
};

export const convertBigIntsToWasmFields = (bigInts: bigint[]): string[] => {
  return bigInts.map(bigInt => bigInt.toString() + 'field');
};

const createRandomAleoFieldInt = () => {
  let bigIntString = '';
  for (let i = 0; i < 8; i++) {
    bigIntString += Math.floor(Math.random() * (2**32 - 1));
  }
  return BigInt(bigIntString) % FIELD_MODULUS;
}

export const stripFieldSuffix = (field: string): string => {
  return field.slice(0, field.length - 5);
};

export const stripGroupSuffix = (group: string): string => {
  return group.slice(0, group.length - 5);
};
import { ALEO_FIELD_MODULUS } from "../params/AleoConstants";

export const bigIntsToU16Array = (beBigInts: bigint[]): Uint16Array => {
  const intsAs16s = beBigInts.map(bigInt => bigIntToU16Array(bigInt));
  const u16Array = new Uint16Array(beBigInts.length * 16);
  intsAs16s.forEach((intAs16, index) => {u16Array.set(intAs16, index * 16)});
  return u16Array;
}

export const bigIntToU16Array = (beBigInt: bigint): Uint16Array => {
  const numBits = 256;
  const bitsPerElement = 16;
  const numElements = numBits / bitsPerElement; // 16
  const u16Array = new Uint16Array(numElements); // [[]... []] size 16
  const nonZeroBitString = beBigInt.toString(2); // just converts to a string of 0's and 1's but doesn't mean it's 256 in size
  const paddedZeros = '0'.repeat(numBits - nonZeroBitString.length); // number of 0's needed to add to make the string 256 bits
  const bitString = paddedZeros + nonZeroBitString; // should be full 256 bit string
  for (let i = 0; i < numElements; i++) {
    const startIndex = i * bitsPerElement;
    const endIndex = startIndex + bitsPerElement;
    const bitStringSlice = bitString.slice(startIndex, endIndex);
    const u16 = parseInt(bitStringSlice, 2);
    u16Array[i] = u16;
  } // just chopping up the bits into 16 bit slices and dumping them into new array

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

// export const u32ArrayToBigInts = (u32Array: Uint32Array): bigint[] => {
//   const bigInts = [];
//   for (let i = 0; i < u32Array.length; i += 8) {
//     const u32s = u32Array.slice(i, i + 8);
//     let bigIntString = '';
//     for (let j = 0; j < u32s.length; j++) {
//       const u32 = u32s[j];
//       const u32String = u32.toString(2);
//       const paddedZeros = '0'.repeat(32 - u32String.length);
//       bigIntString = bigIntString + paddedZeros + u32String;
//     }
//     const bigInt = BigInt('0b' + bigIntString);
//     bigInts.push(bigInt);
//   }
//   return bigInts;
// }

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
  return BigInt(bigIntString) % ALEO_FIELD_MODULUS;
}

export const stripFieldSuffix = (field: string): string => {
  return field.slice(0, field.length - 5);
};

export const stripGroupSuffix = (group: string): string => {
  return group.slice(0, group.length - 5);
};
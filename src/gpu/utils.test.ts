import { bigIntToU32Array, bigIntsToU32Array, u32ArrayToBigInts } from "./utils";

describe('utils', () => {
  describe('bigIntsToU32Array', () => {
    it.each([
      [BigInt(0), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 0])],
      [BigInt(1), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 1])],
      [BigInt(33), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 33])],
      [BigInt(4294967297), new Uint32Array([0, 0, 0, 0, 0, 0, 1, 1])]
    ])('should convert bigints to u32 arrays', (bigIntToConvert: bigint, expectedU32Array: Uint32Array) => {
      const u32Array = bigIntsToU32Array([bigIntToConvert]);
      expect(u32Array).toEqual(expectedU32Array);
    });
  });

  describe('bigIntToU32Array', () => {
    it.each([
      [BigInt(0), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 0])],
      [BigInt(1), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 1])],
      [BigInt(33), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 33])],
      [BigInt(4294967297), new Uint32Array([0, 0, 0, 0, 0, 0, 1, 1])]
    ])('should convert a bigint to u32 array', (bigIntToConvert: bigint, expectedU32Array: Uint32Array) => {
      const u32Array = bigIntToU32Array(bigIntToConvert);
      expect(u32Array).toEqual(expectedU32Array);
    });
  });

  describe('u32ArrayToBigInts', () => {
    it.each([
      [BigInt(0), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 0])],
      [BigInt(1), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 1])],
      [BigInt(33), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 33])],
      [BigInt(4294967297), new Uint32Array([0, 0, 0, 0, 0, 0, 1, 1])]
    ])('should convert a bigint to u32 array', (expectedBigInt: bigint, u32Array: Uint32Array) => {
      const bigInt = u32ArrayToBigInts(u32Array);
      expect(bigInt).toEqual([expectedBigInt]);
    });
  });
});
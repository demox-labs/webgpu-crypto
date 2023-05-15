import { ALEO_FIELD_MODULUS } from "../params/AleoConstants";
import { bigIntToU32Array, bigIntsToU32Array, u32ArrayToBigInts } from "./utils";

const testData: [bigint, Uint32Array][] = [
  [BigInt(0), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 0])],
  [BigInt(1), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 1])],
  [BigInt(33), new Uint32Array([0, 0, 0, 0, 0, 0, 0, 33])],
  [BigInt(4294967297), new Uint32Array([0, 0, 0, 0, 0, 0, 1, 1])],
  [ALEO_FIELD_MODULUS, new Uint32Array([313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 1])],
  [BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'), new Uint32Array([4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295])],
  [BigInt('6924886788847882060123066508223519077232160750698452411071850219367055984476'), new Uint32Array([256858326, 3006847798, 1208683936, 2370827163, 3854692792, 1079629005, 1919445418, 2787346268])],
  [BigInt('60001509534603559531609739528203892656505753216962260608619555'), new Uint32Array([0, 9558, 3401397337, 1252835688, 2587670639, 1610789716, 3992821760, 136227])],
  [BigInt('30000754767301779765804869764101946328252876608481130304309778'), new Uint32Array([0, 4779, 1700698668, 2773901492, 1293835319, 2952878506, 1996410880, 68114])],
];

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
    it.each(testData)('should convert a bigint to u32 array', (bigIntToConvert: bigint, expectedU32Array: Uint32Array) => {
      const u32Array = bigIntToU32Array(bigIntToConvert);
      expect(u32Array).toEqual(expectedU32Array);
    });
  });

  describe('u32ArrayToBigInts', () => {
    it.each(testData)('should convert a bigint to u32 array', (expectedBigInt: bigint, u32Array: Uint32Array) => {
      const bigInt = u32ArrayToBigInts(u32Array);
      expect(bigInt).toEqual([expectedBigInt]);
    });
  });
});
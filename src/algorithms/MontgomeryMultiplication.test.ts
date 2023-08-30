import { bigIntToUint32Array, uint32ArrayToBigInt } from "../gpu/utils";
import { FIELD_MODULUS } from "../params/BLS12_377Constants";
import { Montgomery, Montgomery_K, Montgomery_MultiPrecisionREDC } from "./MontgomeryMultiplication";

describe('Montgomery', () => {
  it.each([
    [BigInt(8), BigInt(7), BigInt(56)],
    [FIELD_MODULUS, BigInt(0), BigInt(0)],
    [FIELD_MODULUS, BigInt(2), BigInt(0)],
    [FIELD_MODULUS, FIELD_MODULUS, BigInt(0)],
    [FIELD_MODULUS + BigInt(2), BigInt(2), BigInt(4)],
  ])('properly does modulus multiplication', (a: bigint, b: bigint, expected: bigint) => {
      const result = Montgomery(a, b);
      expect(result).toEqual(expected);
  });

  it.each([
    [BigInt(8), BigInt(7), BigInt(56)],
    [FIELD_MODULUS, BigInt(0), BigInt(0)],
    [FIELD_MODULUS, BigInt(2), BigInt(0)],
    [FIELD_MODULUS, FIELD_MODULUS, BigInt(0)],
    [FIELD_MODULUS + BigInt(2), BigInt(2), BigInt(4)],
  ])('properly does modulus multiplication', (a: bigint, b: bigint, expected: bigint) => {
      const result = Montgomery_K(a, b);
      expect(result).toEqual(expected);
  });

  it.each([
    [BigInt(8), BigInt(7), BigInt(56)],
    [FIELD_MODULUS, BigInt(0), BigInt(0)],
    [FIELD_MODULUS, BigInt(2), BigInt(0)],
    [FIELD_MODULUS, FIELD_MODULUS, BigInt(0)],
    [FIELD_MODULUS + BigInt(2), BigInt(2), BigInt(4)],
  ])('properly does modulus multiplication', (a: bigint, b: bigint, expected: bigint) => {
      const mul = a * b;
      const t = bigIntToUint32Array(mul, false);
      const result = Montgomery_MultiPrecisionREDC(t);
      const res = uint32ArrayToBigInt(result, false);
      expect(res).toEqual(expected);
  });
});
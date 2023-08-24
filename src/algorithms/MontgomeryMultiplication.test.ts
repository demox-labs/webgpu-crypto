import { FIELD_MODULUS } from "../params/BLS12_377Constants";
import { Montgomery } from "./MontgomeryMultiplication";

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
});
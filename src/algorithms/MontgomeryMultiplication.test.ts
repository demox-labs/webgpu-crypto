import { ALEO_FIELD_MODULUS } from "../params/AleoConstants";
import { Montgomery } from "./MontgomeryMultiplication";

describe('Montgomery', () => {
  it.each([
    [BigInt(8), BigInt(7), BigInt(56)],
    [ALEO_FIELD_MODULUS, BigInt(0), BigInt(0)],
    [ALEO_FIELD_MODULUS, BigInt(2), BigInt(0)],
    [ALEO_FIELD_MODULUS, ALEO_FIELD_MODULUS, BigInt(0)],
    [ALEO_FIELD_MODULUS + BigInt(2), BigInt(2), BigInt(4)],
  ])('properly does modulus multiplication', (a: bigint, b: bigint, expected: bigint) => {
      const result = Montgomery(a, b);
      expect(result).toEqual(expected);
  });
});
import { FIELD_MODULUS } from "../params/BLS12_377Constants";

export const Kochanski = (a: bigint, b: bigint, modulus: bigint = FIELD_MODULUS) => {
  let accumulator = BigInt(0);

  while (b > 0) {
    if (b % BigInt(2) === BigInt(1)) {
      accumulator += a;
      if (accumulator >= modulus) {
        accumulator -= modulus;
      }
    }
    a = (a * BigInt(2)) % modulus;
    b >>= BigInt(1);
  }

  return accumulator;
}

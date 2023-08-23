import { FIELD_MODULUS } from "../params/BLS12_377Constants";
import { bigIntsToU32Array } from "../gpu/utils";

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

export const bulkKochanski = async (inputs1: number[], inputs2: number[]): Promise<Uint32Array> => {
  const results: bigint[] = [];
  for (let i = 0; i < inputs1.length; i++) {
    results.push(Kochanski(BigInt(inputs1[i]), BigInt(inputs2[i])));
  }
  return new Uint32Array(bigIntsToU32Array(results));
};
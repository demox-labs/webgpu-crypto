import { 
  FIELD_MODULUS as N, 
  MONTGOMERY_RADIX as R, 
  MONTGOMERY_RINVERSE as R_PRIME, 
  FIELD_MODULUS_NPRIME as N_PRIME
} from "../params/BLS12_377Constants";

/**
 * Computes a x b mod AleoFieldModulus using Montgomery multiplication.
 * Note that converting to and from Montgomery form are the most expensive operations as they require modulo AleoFieldModulus.
 * 
 * @param a A bigint
 * @param b Another bigint
 * @returns a * b mod AleoFieldModulus
 */
export const Montgomery = (a: bigint, b: bigint) => {
  // convert to montgomery form:
  let a_mont = (a * R) % N;
  let b_mont = (b * R) % N;

  let t = a_mont * b_mont;
  let u = Montgomery_redc(t);

  return (u * R_PRIME) % N;
};

/**
 * https://en.wikipedia.org/wiki/Montgomery_modular_multiplication
 * FUTURE: See Montgomery arithmetic on multiprecision integers section for a reduction utilizing limbs.
 * Note that this would need a rechoosing of R from R = 2^253 to R = 2^256.
 * 
 * REDC is a way to efficiently do tR' mod N, where R' is the inverse of R mod N and t is the product of 2 montgomery numbers.
 * 
 * From Wikipedia:
 * function REDC is
    input: Integers R and N with gcd(R, N) = 1,
           Integer N′ in [0, R − 1] such that NN′ ≡ −1 mod R,
           Integer T in the range [0, RN − 1].
    output: Integer S in the range [0, N − 1] such that S ≡ TR−1 mod N

    m ← ((T mod R)N′) mod R
    t ← (T + mN) / R
    if t ≥ N then
        return t − N
    else
        return t
    end if
end function
 */

const Montgomery_redc = (t: bigint) => {
  const m = ((t % R) * N_PRIME) % R; // Note than this mod R is fast as you can right shift by 253 bits to get the remainder
  const newT = (t + (m * N)) >> BigInt(256); // divide by R
  if (newT >= N) {
    return newT - N;
  }
  else {
    return newT;
  }
}

function extendedGCD(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (a === BigInt(0)) {
    return [b, BigInt(0), BigInt(1)];
  } else {
    const [g, x, y] = extendedGCD(b % a, a);
    return [g, y - (b / a) * x, x];
  }
}

// Used for finding R' such that RR' mod N = 1
function modInv(a: bigint, m: bigint): bigint {
  const [g, x, _] = extendedGCD(a, m);
  if (g !== BigInt(1)) {
    throw new Error('Modular inverse does not exist');
  } else {
    return (x % m + m) % m;  // Ensure the result is positive
  }
}

// const RInv = modInv(R, N);
// console.log(`The modular multiplicative inverse R' is: ${RInv.toString()}`);